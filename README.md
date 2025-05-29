# 🐭 LR-Micromouse-AI

A web-based maze solver that uses Q-Learning reinforcement learning to train an AI mouse to find the optimal path through randomly generated mazes. Watch as the mouse learns from trial and error, gradually improving its pathfinding skills over multiple generations.

## What It Does

This project simulates the classic micromouse competition where a robot mouse navigates through an unknown maze to reach the center. Instead of physical hardware, I built a virtual version that:

- **Generates random mazes** using recursive backtracking algorithm
- **Trains an AI mouse** using Q-Learning reinforcement learning
- **Visualizes the learning process** in real-time with smooth animations
- **Tracks performance metrics** across generations
- **Allows human play mode** for comparison with AI performance
- **Saves/loads trained models** for continued learning sessions

## Why I Built This

I wanted to explore reinforcement learning concepts in a visual, interactive way. The micromouse problem is perfect for this because:
- It has clear success criteria (reach the goal)
- The state space is manageable but non-trivial
- You can actually see the AI learning and improving
- It's relatable - we've all solved mazes before

Plus, I thought it would be cool to see an AI mouse get progressively better at maze-solving, just like training a real pet mouse might work.

## Technical Implementation

### Core Technologies
- **Vanilla JavaScript** (ES6 modules) - No frameworks, just clean modern JS
- **HTML5 Canvas** - For smooth maze rendering and mouse animation
- **CSS Grid/Flexbox** - Responsive layout that works on mobile
- **LocalStorage API** - Persistent model saving

### AI Architecture
The Q-Learning agent uses:
- **State representation**: Relative position to goal + surrounding wall pattern
- **Action space**: 4 directional movements (up, down, left, right)
- **Reward function**: Distance-based rewards with penalties for wall collisions and revisiting cells
- **Exploration strategy**: Epsilon-greedy with decay over generations


## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Click "▶️ Start Learning" and watch the magic happen

or access it via the webpage link: https://devonzeuz.github.io/LR-Micromouse-AI/


## How to Use

### Learning Mode
- **Start Learning**: Begin the AI training process
- **Reset**: Reset mouse position (keeps learned knowledge)
- **New Maze**: Generate a completely new maze challenge
- **Save/Load**: Persist your trained models between sessions

### Play Mode
- Switch to **Play Mode** and use arrow keys to solve the maze yourself
- Compare your performance with the AI's best runs
- See if you can beat the machine!

### What to Watch For
- **Early generations**: Lots of random exploration, frequent wall bumping
- **Mid training**: Mouse starts showing preference for goal direction
- **Late training**: Efficient pathfinding with minimal backtracking
- **Convergence**: Consistent optimal or near-optimal solutions

## Project Structure

```
├── index.html          # Main application entry point
├── style.css           # Responsive styling and animations
├── js/
│   ├── main.js         # Application controller and game loop
│   ├── ai.js           # Q-Learning agent implementation
│   ├── maze.js         # Maze generation and rendering
│   └── mouse.js        # Mouse entity and movement logic
```

## The Learning Process

The AI follows a classic reinforcement learning cycle:

1. **Observe** current state (position relative to goal + wall layout)
2. **Choose** action (explore randomly or exploit learned knowledge)
3. **Act** (attempt to move in chosen direction)
4. **Learn** (update Q-values based on reward received)
5. **Repeat** until goal reached or maximum steps exceeded

## Future Enhancements

Some ideas I'm considering:
- **Neural network option**: Compare Q-tables vs deep Q-learning
- **Maze complexity settings**: Adjustable maze sizes and obstacle density
- **Path visualization**: Show heat maps of learned Q-values
- **Tournament mode**: Multiple AI mice competing simultaneously
- **Export functionality**: Save maze solutions as images or videos
