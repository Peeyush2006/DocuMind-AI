import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

def order_points(pts: np.ndarray) -> np.ndarray:
    """Order coordinates: top-left, top-right, bottom-right, bottom-left"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)] # top-left has smallest sum
    rect[2] = pts[np.argmax(s)] # bottom-right has largest sum
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)] # top-right has smallest difference
    rect[3] = pts[np.argmax(diff)] # bottom-left has largest difference
    return rect

def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def detect_document_contour(image: np.ndarray) -> Optional[np.ndarray]:
    """Detects 4-corner document boundary polygon in the image"""
    orig_h, orig_w = image.shape[:2]
    # Resize for faster edge detection
    ratio = orig_h / 500.0
    h_scaled = 500
    w_scaled = int(orig_w / ratio)
    resized = cv2.resize(image, (w_scaled, h_scaled))
    
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)

    # Dilate slightly to connect broken lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4 and cv2.contourArea(c) > (w_scaled * h_scaled * 0.15):
            # Scale coordinates back to original image
            return approx.reshape(4, 2) * ratio
            
    return None

def apply_clahe(image: np.ndarray, clip_limit: float = 2.0, tile_grid_size: int = 8) -> np.ndarray:
    """Adaptive Histogram Equalization to remove shadows and normalize lighting"""
    if len(image.shape) == 3:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return enhanced
    else:
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
        return clahe.apply(image)

def estimate_and_correct_skew(image: np.ndarray) -> Tuple[np.ndarray, float]:
    """Detects text line orientation and deskews"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    
    # Calculate moments / coordinates of foreground pixels
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 100:
        return image, 0.0

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
        
    # Clamp extreme spurious angles
    if abs(angle) > 30:
        angle = 0.0

    if abs(angle) > 0.5:
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated, float(angle)
        
    return image, 0.0

def rotate_image(image: np.ndarray, degrees: int) -> np.ndarray:
    if degrees == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    elif degrees == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    elif degrees == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image

def enhance_document_image(
    input_path: str,
    output_path: str,
    do_crop: bool = True,
    do_deskew: bool = True,
    do_clahe: bool = True,
    rotation_degrees: int = 0
) -> Dict[str, Any]:
    """
    Complete enhancement pipeline:
    1. Optional manual 90/180/270 rotation
    2. Contour detection & 4-point perspective warp
    3. Deskewing based on text lines
    4. CLAHE contrast & illumination normalization
    """
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Could not read image file at {input_path}")

    h_orig, w_orig = img.shape[:2]
    
    if rotation_degrees in (90, 180, 270):
        img = rotate_image(img, rotation_degrees)

    contour_detected = False
    if do_crop:
        corners = detect_document_contour(img)
        if corners is not None:
            img = four_point_transform(img, corners)
            contour_detected = True

    skew_angle = 0.0
    if do_deskew:
        img, skew_angle = estimate_and_correct_skew(img)

    if do_clahe:
        img = apply_clahe(img)

    # Save output
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(output_path, img)

    h_new, w_new = img.shape[:2]

    return {
        "contour_detected": contour_detected,
        "skew_angle": round(skew_angle, 2),
        "rotation_applied": rotation_degrees,
        "original_dimensions": [w_orig, h_orig],
        "enhanced_dimensions": [w_new, h_new],
        "output_path": output_path
    }
