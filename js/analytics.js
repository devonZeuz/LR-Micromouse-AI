export class MazeAnalytics {
    constructor() {
        this.reset();
        this.sessionStartTime = Date.now();
    }

    reset() {
        this.metrics = {
            episodeData: [],
            wallCollisions: 0,
            revisitedCells: 0,
            successfulRuns: 0,
            totalSteps: 0,
            explorationRates: [],
            learningRates: [],
            averageRewards: [],
            pathEfficiencyScores: [],
            convergenceMetrics: {
                lastTenRunsAvg: [],
                isConverged: false,
                convergenceGeneration: null,
                mazeSolved: false,
                optimalSteps: null
            },
            behaviorPatterns: {
                circularMotions: 0,
                backtracking: 0,
                wallFollowing: 0
            },
            timeMetrics: {
                startTime: Date.now(),
                completionTimes: []
            }
        };
    }

    // Called at the end of each episode
    recordEpisode(mouse, ai, generation, steps, wasSuccessful) {
        const episodeData = {
            generation,
            steps,
            wasSuccessful,
            pathLength: mouse.path.length,
            uniqueCellsVisited: new Set(mouse.visited).size,
            explorationRate: ai.explorationRate,
            learningRate: ai.learningRate,
            timeStamp: Date.now(),
            pathEfficiency: this.calculatePathEfficiency(mouse),
            behaviorMetrics: this.analyzeBehavior(mouse)
        };

        this.metrics.episodeData.push(episodeData);
        this.updateConvergenceMetrics(steps, wasSuccessful);
        
        // Save to localStorage periodically
        if (generation % 10 === 0) {
            this.saveAnalytics();
        }

        return this.generateInsights();
    }

    calculatePathEfficiency(mouse) {
        const optimalDistance = Math.abs(mouse.maze.end.x - mouse.maze.start.x) + 
                              Math.abs(mouse.maze.end.y - mouse.maze.start.y);
        const actualDistance = mouse.path.length;
        return optimalDistance / actualDistance; // 1 is perfect, closer to 0 means less efficient
    }

    analyzeBehavior(mouse) {
        const behavior = {
            circularMotions: 0,
            backtracking: 0,
            wallFollowing: 0,
            explorationPattern: ''
        };

        // Detect circular motions (returning to same position multiple times)
        const positionCounts = new Map();
        mouse.path.forEach(pos => {
            const key = `${pos.x},${pos.y}`;
            positionCounts.set(key, (positionCounts.get(key) || 0) + 1);
        });
        behavior.circularMotions = Array.from(positionCounts.values())
            .filter(count => count > 2).length;

        // Detect backtracking (reversing direction)
        for (let i = 2; i < mouse.path.length; i++) {
            if (mouse.path[i].x === mouse.path[i-2].x && 
                mouse.path[i].y === mouse.path[i-2].y) {
                behavior.backtracking++;
            }
        }

        // Analyze wall following behavior
        let wallFollowingCount = 0;
        for (let i = 1; i < mouse.path.length; i++) {
            const hasWallAdjacent = this.checkAdjacentWalls(mouse, mouse.path[i].x, mouse.path[i].y);
            if (hasWallAdjacent) wallFollowingCount++;
        }
        behavior.wallFollowing = wallFollowingCount / mouse.path.length;

        // Determine exploration pattern
        if (behavior.wallFollowing > 0.7) {
            behavior.explorationPattern = 'Wall Following';
        } else if (behavior.circularMotions > mouse.path.length * 0.1) {
            behavior.explorationPattern = 'Circular Search';
        } else if (behavior.backtracking > mouse.path.length * 0.3) {
            behavior.explorationPattern = 'Random Exploration';
        } else {
            behavior.explorationPattern = 'Directed Search';
        }

        return behavior;
    }

    checkAdjacentWalls(mouse, x, y) {
        return mouse.maze.isWall(x + 1, y) || 
               mouse.maze.isWall(x - 1, y) || 
               mouse.maze.isWall(x, y + 1) || 
               mouse.maze.isWall(x, y - 1);
    }

    updateConvergenceMetrics(steps, wasSuccessful) {
        if (!wasSuccessful) return;

        this.metrics.convergenceMetrics.lastTenRunsAvg.push(steps);
        if (this.metrics.convergenceMetrics.lastTenRunsAvg.length > 10) {
            this.metrics.convergenceMetrics.lastTenRunsAvg.shift();
        }

        // Enhanced convergence detection
        if (this.metrics.convergenceMetrics.lastTenRunsAvg.length === 10) {
            const avg = this.metrics.convergenceMetrics.lastTenRunsAvg.reduce((a, b) => a + b) / 10;
            const allWithinRange = this.metrics.convergenceMetrics.lastTenRunsAvg
                .every(steps => Math.abs(steps - avg) / avg < 0.05); // Tightened threshold to 5%

            // Check if the last 5 runs had exactly the same number of steps
            const lastFiveSteps = this.metrics.convergenceMetrics.lastTenRunsAvg.slice(-5);
            const hasOptimalPath = lastFiveSteps.every(step => step === lastFiveSteps[0]);

            if (allWithinRange && !this.metrics.convergenceMetrics.isConverged) {
                this.metrics.convergenceMetrics.isConverged = true;
                this.metrics.convergenceMetrics.convergenceGeneration = this.metrics.episodeData.length;
            }

            // New: Detect if maze is solved optimally
            if (hasOptimalPath) {
                this.metrics.convergenceMetrics.mazeSolved = true;
                this.metrics.convergenceMetrics.optimalSteps = lastFiveSteps[0];
                return true; // Indicate maze is solved optimally
            }
        }
        return false;
    }

    generateInsights() {
        const recentEpisodes = this.metrics.episodeData.slice(-10);
        const insights = {
            learningProgress: this.calculateLearningProgress(),
            behaviorAnalysis: this.analyzeLearningBehavior(),
            performanceMetrics: this.calculatePerformanceMetrics(recentEpisodes),
            recommendations: this.generateRecommendations(),
            mazeSolved: this.metrics.convergenceMetrics.mazeSolved || false,
            optimalSteps: this.metrics.convergenceMetrics.optimalSteps
        };

        return insights;
    }

    calculateLearningProgress() {
        const episodes = this.metrics.episodeData;
        if (episodes.length < 2) return { status: 'Initializing', trend: 'neutral' };

        const recent = episodes.slice(-10);
        const previousBatch = episodes.slice(-20, -10);

        const recentAvg = recent.reduce((sum, ep) => sum + ep.steps, 0) / recent.length;
        const previousAvg = previousBatch.length ? 
            previousBatch.reduce((sum, ep) => sum + ep.steps, 0) / previousBatch.length : Infinity;

        const improvement = ((previousAvg - recentAvg) / previousAvg) * 100;

        return {
            status: this.metrics.convergenceMetrics.isConverged ? 'Converged' : 'Learning',
            trend: improvement > 5 ? 'improving' : improvement < -5 ? 'degrading' : 'stable',
            improvement: Math.round(improvement * 100) / 100
        };
    }

    analyzeLearningBehavior() {
        const recent = this.metrics.episodeData.slice(-10);
        const patterns = recent.map(ep => ep.behaviorMetrics.explorationPattern);
        const dominantPattern = this.findDominantPattern(patterns);

        return {
            dominantStrategy: dominantPattern,
            explorationRate: recent[recent.length - 1]?.explorationRate || 0,
            efficiency: this.calculateAverageEfficiency(recent)
        };
    }

    findDominantPattern(patterns) {
        const counts = patterns.reduce((acc, pattern) => {
            acc[pattern] = (acc[pattern] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    calculateAverageEfficiency(episodes) {
        if (!episodes.length) return 0;
        return episodes.reduce((sum, ep) => sum + ep.pathEfficiency, 0) / episodes.length;
    }

    calculatePerformanceMetrics(episodes) {
        if (!episodes.length) return null;

        return {
            averageSteps: Math.round(episodes.reduce((sum, ep) => sum + ep.steps, 0) / episodes.length),
            successRate: episodes.filter(ep => ep.wasSuccessful).length / episodes.length * 100,
            averageUniqueCells: Math.round(episodes.reduce((sum, ep) => sum + ep.uniqueCellsVisited, 0) / episodes.length)
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const progress = this.calculateLearningProgress();
        const behavior = this.analyzeLearningBehavior();

        if (progress.trend === 'degrading') {
            recommendations.push('Consider decreasing the learning rate');
        }

        if (behavior.explorationRate < 0.1 && !this.metrics.convergenceMetrics.isConverged) {
            recommendations.push('Increase exploration rate to avoid local minimums');
        }

        if (behavior.efficiency < 0.3) {
            recommendations.push('Mouse is taking very inefficient paths. Consider adjusting reward function');
        }

        return recommendations;
    }

    saveAnalytics() {
        try {
            localStorage.setItem('mazeAnalytics', JSON.stringify({
                metrics: this.metrics,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save analytics:', error);
        }
    }

    loadAnalytics() {
        try {
            const saved = localStorage.getItem('mazeAnalytics');
            if (saved) {
                const data = JSON.parse(saved);
                this.metrics = data.metrics;
                return true;
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
        return false;
    }
} 