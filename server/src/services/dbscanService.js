const { calculateDistance } = require('./geoService');

/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * Tailored for geographical coordinates with Haversine distance metric.
 */
class GeoDBSCAN {
  /**
   * @param {Array} points Array of objects containing { latitude, longitude, ... }
   * @param {number} epsilon Neighborhood search radius in meters (default: 450m)
   * @param {number} minPts Minimum number of points to form a dense cluster (default: 2)
   */
  constructor(points, epsilon = 450, minPts = 2) {
    this.points = points;
    this.epsilon = epsilon;
    this.minPts = minPts;
    this.visited = new Set();
    this.clustered = new Set();
    this.clusters = [];
    this.noise = [];
  }

  /**
   * Find all points within epsilon distance of target point
   */
  regionQuery(pointIdx) {
    const target = this.points[pointIdx];
    const neighbors = [];

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const dist = calculateDistance(
        target.latitude,
        target.longitude,
        p.latitude,
        p.longitude
      );

      if (dist <= this.epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Expand cluster from seed point
   */
  expandCluster(pointIdx, neighbors, currentCluster) {
    currentCluster.push(this.points[pointIdx]);
    this.clustered.add(pointIdx);

    let queue = [...neighbors];

    while (queue.length > 0) {
      const currentPointIdx = queue.shift();

      if (!this.visited.has(currentPointIdx)) {
        this.visited.add(currentPointIdx);
        const currentNeighbors = this.regionQuery(currentPointIdx);

        if (currentNeighbors.length >= this.minPts) {
          queue.push(...currentNeighbors.filter((idx) => !queue.includes(idx)));
        }
      }

      if (!this.clustered.has(currentPointIdx)) {
        currentCluster.push(this.points[currentPointIdx]);
        this.clustered.add(currentPointIdx);
      }
    }
  }

  /**
   * Execute DBSCAN clustering
   */
  run() {
    this.visited.clear();
    this.clustered.clear();
    this.clusters = [];
    this.noise = [];

    for (let i = 0; i < this.points.length; i++) {
      if (this.visited.has(i)) continue;

      this.visited.add(i);
      const neighbors = this.regionQuery(i);

      if (neighbors.length < this.minPts) {
        this.noise.push(this.points[i]);
      } else {
        const newCluster = [];
        this.expandCluster(i, neighbors, newCluster);
        this.clusters.push(newCluster);
      }
    }

    // Double check points in noise: if they ended up clustered later, remove from noise
    this.noise = this.noise.filter((p) => {
      return !this.clusters.some((c) =>
        c.some((cp) => cp._id && p._id && cp._id.toString() === p._id.toString())
      );
    });

    return {
      clusters: this.clusters,
      noise: this.noise,
      clusterCount: this.clusters.length,
      noiseCount: this.noise.length,
      totalPoints: this.points.length,
    };
  }
}

/**
 * Convenience runner for DBSCAN
 */
function runDBSCAN(points, epsilon = 450, minPts = 2) {
  const dbscan = new GeoDBSCAN(points, epsilon, minPts);
  return dbscan.run();
}

module.exports = {
  GeoDBSCAN,
  runDBSCAN,
};
