export class QLearningAgent {
    /**
     * @param {number} learningRate - The learning rate (alpha) determines how much new information overrides old information. (0-1)
     * @param {number} discountFactor - The discount factor (gamma) determines the importance of future rewards. (0-1)
     * @param {number} explorationRate - The initial exploration rate (epsilon) determines the probability of taking a random action.
     * @param {number} explorationDecay - The rate at which the exploration rate decays over generations.
     * @param {number} minExplorationRate - The minimum exploration rate to prevent exploration from dropping to zero.
     */
    constructor(
        learningRate = 0.3,      // Higher for faster learning
        discountFactor = 0.95,   // High for long-term planning
        explorationRate = 0.8,   // Start lower
        explorationDecay = 0.998, // Slower decay
        minExplorationRate = 0.05 // Higher minimum
    ) {
        this.learningRate = learningRate;
        this.discountFactor = discountFactor;
        this.explorationRate = explorationRate;
        this.explorationDecay = explorationDecay;
        this.minExplorationRate = minExplorationRate;
        this.qTable = new Map();
        this.performanceTracker = new PerformanceTracker();
        this.experienceBuffer = new ExperienceBuffer();
    }

    getRelativeState(mouse) {
        const distToGoal = {
            x: mouse.maze.end.x - mouse.x,
            y: mouse.maze.end.y - mouse.y
        };
        
        const walls = [
            mouse.maze.isWall(mouse.x + 1, mouse.y), // right
            mouse.maze.isWall(mouse.x, mouse.y + 1), // down
            mouse.maze.isWall(mouse.x - 1, mouse.y), // left
            mouse.maze.isWall(mouse.x, mouse.y - 1)  // up
        ];
        
        return `${distToGoal.x},${distToGoal.y},${walls.join('')}`;
    }

    /**
     * @param {string} state - The string representation of the current state.
     * @returns {number} The chosen action (0: right, 1: down, 2: left, 3: up).
     */
    getAction(state) {
        // Exploration vs Exploitation
        if (Math.random() < this.explorationRate) {
            return Math.floor(Math.random() * 4); // Explore: random action
        }

        if (!this.qTable.has(state)) {
            this.qTable.set(state, [0, 0, 0, 0]);
        }
        const qValues = this.qTable.get(state);
        
        // Exploit: find best action (handle ties)
        const maxQ = Math.max(...qValues);
        const actionsWithMaxQ = qValues
            .map((value, index) => (value === maxQ ? index : -1))
            .filter(index => index !== -1);
            
        return actionsWithMaxQ[Math.floor(Math.random() * actionsWithMaxQ.length)];
    }

    /**
     * Performs the Q-learning update based on a taken action and received reward.
     * @param {string} state - The string representation of the state before the action.
     * @param {number} action - The action taken from the state.
     * @param {number} reward - The reward received after taking the action.
     * @param {string} nextState - The string representation of the state after the action.
     */
    learn(state, action, reward, nextState) {
        // Store experience
        this.experienceBuffer.add(state, action, reward, nextState);

        if (!this.qTable.has(state)) {
            this.qTable.set(state, [0, 0, 0, 0]);
        }
        if (!this.qTable.has(nextState)) {
            this.qTable.set(nextState, [0, 0, 0, 0]);
        }

        // Q-learning update
        const currentQ = this.qTable.get(state)[action];
        const nextMaxQ = Math.max(...this.qTable.get(nextState));
        const newQ = currentQ + this.learningRate * (reward + this.discountFactor * nextMaxQ - currentQ);
        
        this.qTable.get(state)[action] = newQ;

        // Experience replay
        this.replayExperience();
    }

    replayExperience() {
        const batch = this.experienceBuffer.sample();
        batch.forEach(exp => {
            if (!this.qTable.has(exp.state)) {
                this.qTable.set(exp.state, [0, 0, 0, 0]);
            }
            if (!this.qTable.has(exp.nextState)) {
                this.qTable.set(exp.nextState, [0, 0, 0, 0]);
            }

            const currentQ = this.qTable.get(exp.state)[exp.action];
            const nextMaxQ = Math.max(...this.qTable.get(exp.nextState));
            const newQ = currentQ + this.learningRate * (exp.reward + this.discountFactor * nextMaxQ - currentQ);
            
            this.qTable.get(exp.state)[exp.action] = newQ;
        });
    }

    /**
     * Calculates the reward for a given action based on the mouse's position and the maze state.
     * (Note: This reward function is used in main.js, not directly in the learn method here).
     * @param {Mouse} mouse - The mouse object.
     * @param {number} action - The action taken.
     * @returns {number} The calculated reward.
     */
    getReward(mouse, action, wasValidMove) {
        let reward = -0.1; // Base step penalty
        
        if (!wasValidMove) {
            return -10; // Wall collision
        }
        
        // Goal reached
        if (mouse.isAtEnd()) {
            return 100;
        }
        
        // Distance-based reward (Manhattan distance)
        const currentDist = Math.abs(mouse.x - mouse.maze.end.x) + 
                           Math.abs(mouse.y - mouse.maze.end.y);
        const prevDist = Math.abs((mouse.x - mouse.lastMove.dx) - mouse.maze.end.x) + 
                        Math.abs((mouse.y - mouse.lastMove.dy) - mouse.maze.end.y);
        
        if (currentDist < prevDist) {
            reward += 2; // Moving closer
        } else if (currentDist > prevDist) {
            reward -= 1; // Moving away
        }
        
        // Revisit penalty
        const posKey = `${mouse.x},${mouse.y}`;
        if (mouse.visited.has(posKey)) {
            reward -= 5; // Discourage revisiting
        }
        
        return reward;
    }

    /**
     * Decays the exploration rate (epsilon) over time, typically after each episode or successful run.
     */
    decayExploration() {
        this.explorationRate = Math.max(this.minExplorationRate, this.explorationRate * this.explorationDecay);
    }

    /**
     * Returns a deep copy of the Q-table.
     * @returns {Map<string, number[]>} A copy of the Q-table.
     */
    getQTableCopy() {
        const qTableCopy = new Map();
        this.qTable.forEach((value, key) => {
            qTableCopy.set(key, [...value]);
        });
        return qTableCopy;
    }

    /**
     * Loads a provided Q-table into the agent.
     * @param {Map<string, number[]>} qTable - The Q-table to load.
     */
    loadQTable(qTable) {
        this.qTable = new Map(qTable);
    }

    updateLearningRate(episode, performance) {
        if (this.performanceTracker.isImproving()) {
            this.learningRate = Math.min(0.5, this.learningRate * 1.01);
        } else {
            this.learningRate = Math.max(0.1, this.learningRate * 0.99);
        }
    }

    /**
     * Saves the current Q-table to localStorage
     * @param {string} key - Optional key to save under. Defaults to 'micromouse_qtable'
     */
    saveQTable(key = 'micromouse_qtable') {
        try {
            // Convert Map to array of entries for JSON serialization
            const serializedQTable = Array.from(this.qTable.entries());
            localStorage.setItem(key, JSON.stringify(serializedQTable));
            return true;
        } catch (error) {
            console.error('Failed to save Q-table:', error);
            return false;
        }
    }

    /**
     * Loads a Q-table from localStorage
     * @param {string} key - Optional key to load from. Defaults to 'micromouse_qtable'
     * @returns {boolean} - Whether the load was successful
     */
    loadQTableFromStorage(key = 'micromouse_qtable') {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                // Convert the saved array back to a Map
                const entries = JSON.parse(saved);
                this.qTable = new Map(entries);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load Q-table:', error);
            return false;
        }
    }
}

class ExperienceBuffer {
    constructor(maxSize = 10000) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    
    add(state, action, reward, nextState) {
        if (this.buffer.length >= this.maxSize) {
            this.buffer.shift();
        }
        this.buffer.push({state, action, reward, nextState});
    }
    
    sample(batchSize = 32) {
        const batch = [];
        for (let i = 0; i < Math.min(batchSize, this.buffer.length); i++) {
            const idx = Math.floor(Math.random() * this.buffer.length);
            batch.push(this.buffer[idx]);
        }
        return batch;
    }
}

class PerformanceTracker {
    constructor() {
        this.recentPerformances = [];
        this.windowSize = 100;
    }
    
    addResult(steps) {
        this.recentPerformances.push(steps);
        if (this.recentPerformances.length > this.windowSize) {
            this.recentPerformances.shift();
        }
    }
    
    getAveragePerformance() {
        if (this.recentPerformances.length === 0) return 0;
        return this.recentPerformances.reduce((a, b) => a + b) / 
               this.recentPerformances.length;
    }
    
    isImproving() {
        if (this.recentPerformances.length < 20) return false;
        const recent = this.recentPerformances.slice(-10);
        const older = this.recentPerformances.slice(-20, -10);
        const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b) / older.length;
        return recentAvg < olderAvg; // Lower steps = better
    }
} 