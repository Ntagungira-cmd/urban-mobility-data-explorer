import logging
from typing import Tuple, Any, List, Dict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SpatialGridIndex:
    """
    Custom spatial indexing structure for efficient geographical queries.
    Divides NYC area into grid cells for fast location-based lookups.
    """

    def __init__(self, grid_size: float = 0.01):
        """
        Initialize spatial grid index
        grid_size: size of each grid cell in degrees (lat/lon)
        """
        self.grid_size = grid_size
        self.grid = {}
        logger.info(f"Initialized SpatialGridIndex with grid_size={grid_size}")

    def _get_cell_key(self, lat: float, lon: float) -> Tuple[int, int]:
        """Convert lat/lon to grid cell coordinates"""
        cell_x = int(lon / self.grid_size)
        cell_y = int(lat / self.grid_size)
        return cell_x, cell_y

    def insert(self, lat: float, lon: float, data: Any):
        """Insert a point into the spatial index"""
        cell_key = self._get_cell_key(lat, lon)
        if cell_key not in self.grid:
            self.grid[cell_key] = []
        self.grid[cell_key].append(data)

    def query_radius(self, lat: float, lon: float, radius_cells: int = 1) -> List[Any]:
        """Query all points within radius cells of given location"""
        center_cell = self._get_cell_key(lat, lon)
        results = []

        for dx in range(-radius_cells, radius_cells + 1):
            for dy in range(-radius_cells, radius_cells + 1):
                cell_key = (center_cell[0] + dx, center_cell[1] + dy)
                if cell_key in self.grid:
                    results.extend(self.grid[cell_key])

        return results

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about the spatial index"""
        cell_counts = [len(points) for points in self.grid.values()]
        return {
            'total_cells': len(self.grid),
            'total_points': sum(cell_counts),
            'avg_points_per_cell': sum(cell_counts) / len(cell_counts) if cell_counts else 0,
            'max_points_in_cell': max(cell_counts) if cell_counts else 0
        }
