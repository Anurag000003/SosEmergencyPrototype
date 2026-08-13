from geopy.distance import geodesic

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the distance in kilometers between two points on Earth.
    """
    if None in (lat1, lon1, lat2, lon2):
        return 9999.0
    return geodesic((lat1, lon1), (lat2, lon2)).kilometers
