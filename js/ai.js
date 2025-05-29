/**
 * Q-Learning Agent for Micromouse AI
 * Implements reinforcement learning to solve maze navigation
 */
export class QLearningAgent {
    /**
     * Initialize Q-Learning agent with hyperparameters
     * @param {number} learningRate - How quickly to incorporate new information (0-1)
     * @param {number} discountFactor - Importance of future rewards vs immediate rewards (0-1)
     * @param {number} explorationRate - Probability of random action vs best known action
     * @param {number} explorationDecay - Rate at which exploration decreases over time
     * @param {number} minExplorationRate - Minimum exploration to maintain
     */
    constructor(
        learningRate = 0.3,
        discountFactor = 0.95,
        explorationRate = 0.8,
        explorationDecay = 0.998,
        minExplorationRate = 0.05
    ) {
        // Validate hyperparameters
        this.learningRate = Math.max(0, Math.min(1, learningRate));
        this.discountFactor = Math.max(0, Math.min(1, discountFactor));
        this.explorationRate = Math.max(0, Math.min(1, explorationRate));
        this.explorationDecay = Math.max(0.9, Math.min(1, explorationDecay));
        this.minExplorationRate = Math.max(0, Math.min(0.2, minExplorationRate));
        
        this.qTable = new Map();
        this.stateActionCounts = new Map(); // Track state-action pair frequencies
    }

    /**
     * Create state representation focusing on relative goal position and local obstacles
     * This encoding helps the agent generalize across different maze positions
     */
    getRelativeState(mouse) {
        try {
            const distToGoal = {
                x: mouse.maze.end.x - mouse.x,
                y: mouse.maze.end.y - mouse.y
            };
            
            // Check walls in all four directions (right, down, left, up)
            const walls = [
                mouse.maze.isWall(mouse.x + 1, mouse.y),
                mouse.maze.isWall(mouse.x, mouse.y + 1), 
                mouse.maze.isWall(mouse.x - 1, mouse.y),
                mouse.maze.isWall(mouse.x, mouse.y - 1)
            ];
            
            // Create compact state string
            return `${distToGoal.x},${distToGoal.y},${walls.map(w => w ? '1' : '0').join('')}`;
        } catch (error) {
            console.error('Error generating state:', error);
            return 'error_state';
        }
    }

    /**
     * Select action using epsilon-greedy strategy with tie-breaking
     * @param {string} state - Current state representation
     * @returns {number} Action index (0: right, 1: down, 2: left, 3: up)
     */
    getAction(state) {
        try {
            // Exploration: take random action
            if (Math.random() < this.explorationRate) {
                return Math.floor(Math.random() * 4);
            }

            // Initialize Q-values for new states
            if (!this.qTable.has(state)) {
                this.qTable.set(state, new Array(4).fill(0));
            }

            const qValues = this.qTable.get(state);
            const maxQ = Math.max(...qValues);
            
            // Handle ties by random selection among best actions
            const bestActions = qValues
                .map((value, index) => value === maxQ ? index : null)
                .filter(index => index !== null);
                
            return bestActions[Math.floor(Math.random() * bestActions.length)];
        } catch (error) {
            console.error('Error selecting action:', error);
            return Math.floor(Math.random() * 4); // Fallback to random action
        }
    }

    /**
     * Update Q-values based on experience using Bellman equation
     * Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
     */
    learn(state, action, reward, nextState) {
        try {
            // Initialize Q-values for new states
            if (!this.qTable.has(state)) {
                this.qTable.set(state, new Array(4).fill(0));
            }
            if (!this.qTable.has(nextState)) {
                this.qTable.set(nextState, new Array(4).fill(0));
            }

            // Update state-action counts for tracking
            const stateActionKey = `${state}:${action}`;
            this.stateActionCounts.set(stateActionKey, 
                (this.stateActionCounts.get(stateActionKey) || 0) + 1
            );

            // Apply Q-learning update rule
            const currentQ = this.qTable.get(state)[action];
            const maxNextQ = Math.max(...this.qTable.get(nextState));
            const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
            
            this.qTable.get(state)[action] = newQ;
        } catch (error) {
            console.error('Error in learning update:', error);
        }
    }

    /**
     * Calculate reward based on mouse action and resulting state
     * Reward structure encourages goal-seeking while penalizing inefficient behavior
     */
    getReward(mouse, action, wasValidMove) {
        let reward = -0.1; // Small step penalty to encourage efficiency
        
        if (!wasValidMove) {
            return -10; // Significant penalty for hitting walls
        }
        
        // Big reward for reaching the goal
        if (mouse.isAtEnd()) {
            return 100;
        }
        
        // Distance-based reward to guide exploration
        const currentDist = Math.abs(mouse.x - mouse.maze.end.x) + 
                           Math.abs(mouse.y - mouse.maze.end.y);
        
        if (mouse.lastMove && mouse.lastMove.dx !== undefined) {
            const prevDist = Math.abs(mouse.lastMove.dx - mouse.maze.end.x) + 
                            Math.abs(mouse.lastMove.dy - mouse.maze.end.y);
            
            if (currentDist < prevDist) {
                reward += 2; // Reward for moving closer to goal
            } else if (currentDist > prevDist) {
                reward -= 1; // Penalty for moving away from goal
            }
        }
        
        // Discourage revisiting already explored cells
        const posKey = `${mouse.x},${mouse.y}`;
        if (mouse.visited.has(posKey)) {
            const visitCount = Array.from(mouse.visited).filter(pos => pos === posKey).length;
            reward -= Math.min(5, visitCount); // Escalating penalty for repeated visits
        }
        
        return reward;
    }

    /**
     * Reduce exploration rate over time to shift from exploration to exploitation
     */
    decayExploration() {
        this.explorationRate = Math.max(
            this.minExplorationRate, 
            this.explorationRate * this.explorationDecay
        );
    }

    /**
     * Get deep copy of Q-table for saving best performing agents
     */
    getQTableCopy() {
        const copy = new Map();
        for (const [key, value] of this.qTable) {
            copy.set(key, [...value]);
        }
        return copy;
    }

    /**
     * Load Q-table from another agent (for loading best performers)
     */
    loadQTable(qTable) {
        if (qTable instanceof Map) {
            this.qTable = new Map();
            for (const [key, value] of qTable) {
                this.qTable.set(key, Array.isArray(value) ? [...value] : new Array(4).fill(0));
            }
        } else {
            console.error('Invalid Q-table format provided');
        }
    }

    /**
     * Get training statistics for monitoring learning progress
     */
    getTrainingStats() {
        return {
            statesExplored: this.qTable.size,
            explorationRate: this.explorationRate,
            totalStateActionPairs: this.stateActionCounts.size,
            avgQValue: this.getAverageQValue()
        };
    }

    /**
     * Calculate average Q-value as a rough measure of learned value
     */
    getAverageQValue() {
        if (this.qTable.size === 0) return 0;
        
        let sum = 0;
        let count = 0;
        
        for (const qValues of this.qTable.values()) {
            for (const qValue of qValues) {
                sum += qValue;
                count++;
            }
        }
        
        return count > 0 ? sum / count : 0;
    }

    /**
     * Reset agent to initial untrained state
     */
    reset() {
        this.qTable.clear();
        this.stateActionCounts.clear();
        this.explorationRate = 0.8; // Reset to initial exploration rate
    }

    /**
     * Saves the current Q-table to localStorage
     * @param {string} key - Optional key to save under. Defaults to 'micromouse_qtable'
     */
    saveQTable(key = 'micromouse_qtable') {
        try {
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