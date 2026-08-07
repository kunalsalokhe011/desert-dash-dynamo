# Endless Horizon

Project Title: Endless Dash

Overview

Create a polished, modern browser-based endless runner game inspired by Google's Chrome Dino Runner, but with significantly enhanced visuals, gameplay mechanics, animations, audio, and progression. The game should be lightweight, responsive, highly optimized, and playable on both desktop and mobile browsers.

The game must feel smooth (60 FPS), addictive, and professionally designed while maintaining the simplicity that made the original Dino Runner popular.

Technology Stack

Use:

HTML5

CSS3

Vanilla JavaScript (ES6+)

HTML5 Canvas API

No external game engines

Organize code into modules/classes

Clean architecture

Well-commented code

Responsive design

Game Style

Visual style:

Modern minimalist

Flat design

Smooth gradients

Soft shadows

Clean UI

Professional animations

Colorful but not distracting

Theme:

A futuristic desert with changing environments.

Core Gameplay

The player continuously runs automatically.

The objective is to survive as long as possible while avoiding obstacles.

Speed gradually increases.

Difficulty scales naturally.

The player loses after colliding with an obstacle.

Instant restart option.

Player Character

Features:

Smooth running animation

Idle animation

Jump animation

Landing animation

Death animation

Double jump

Optional dash ability

Smooth sprite interpolation

Particle effects while landing

Controls:

Desktop

Space = Jump

Up Arrow = Jump

Down Arrow = Duck

Shift = Dash (optional)

Mobile

Tap = Jump

Swipe Down = Duck

Double Tap = Double Jump

Obstacles

Include multiple obstacle types:

Small cactus

Large cactus

Rock

Moving enemy

Flying drone

Bird

Rolling barrel

Random obstacle combinations

Obstacle spawning should use procedural generation while ensuring fairness.

Collectibles

Coins

Gems

Power crystals

Mystery boxes

Temporary score multipliers

Collectibles should sparkle and animate.

Power-Ups

Magnet

Automatically attracts coins.

Shield

Protects from one collision.

Slow Motion

Reduces game speed.

Double Score

2× score multiplier.

Jetpack

Temporary flying mode.

Speed Boost

Temporary high speed.

Power-ups should have timers and animated indicators.

Dynamic Environment

The background changes automatically over time.

Possible environments:

Morning desert

Sunny afternoon

Sunset

Night

Rain

Fog

Sandstorm

Cyber city

Snow

Space

Smooth transitions between environments.

Background Layers

Implement parallax scrolling.

Layers:

Sky

Mountains

Clouds

Distant buildings

Ground

Foreground decorations

Each layer scrolls at different speeds.

Weather System

Random weather events:

Rain

Snow

Dust

Fog

Wind

Meteor shower

Lightning

Each affects only visuals.

Day/Night Cycle

Automatically transitions every few minutes.

Include:

Changing sky colors

Stars

Moon

Sun

Dynamic lighting

Particle System

Particles for:

Landing dust

Coin collection

Jump effects

Dash trails

Power-up activation

Explosion on death

Weather particles

Optimized particle pooling.

Score System

Display:

Current score

High score

Distance

Coins collected

Multiplier

Speed level

Store high score using Local Storage.

Progression

Difficulty increases over time by:

Increasing speed

More obstacle frequency

Complex obstacle patterns

Mixed obstacle groups

Moving enemies

Faster flying enemies

Combo System

Award combo bonuses for:

Perfect jumps

Consecutive obstacle clears

Coin streaks

Long survival

Display animated combo text.

Missions

Random missions like:

Collect 100 coins

Jump 50 times

Survive 5 minutes

Reach 5000 score

Complete without using shield

Reward coins or cosmetics.

Unlockables

Characters

Costumes

Trail effects

Background themes

Ground skins

Jump effects

Victory badges

Shop

Spend collected coins on:

Characters

Themes

Particle effects

Trails

Music packs

Power-up upgrades

Audio

Include:

Background music

Jump

Landing

Coin collection

Power-up

Death

Button clicks

Countdown

Mute button

Volume slider

User Interface

Main menu

Play button

High score

Settings

Shop

Achievements

Statistics

Pause menu

Game over screen

Restart button

Share score button

Smooth UI transitions.

Animations

Use easing animations for:

Buttons

Menus

Score updates

Coin collection

Power-up notifications

Game over

Environment transitions

No abrupt movement.

Responsive Design

Support:

Desktop

Tablet

Mobile

Landscape

Portrait

Automatic canvas resizing.

Performance

Optimize for:

60 FPS

Object pooling

Efficient collision detection

Minimal memory allocation

Lazy loading

Efficient rendering

Collision System

Use precise hitboxes.

Include:

Invincibility frames after shield

Smooth collision response

Collision debugging mode

Save System

Save using Local Storage:

High score

Coins

Unlocked items

Settings

Achievements

Statistics

Automatically restore on reload.

Statistics

Track:

Games played

Total jumps

Distance traveled

Coins collected

Best run

Average score

Longest survival

Obstacles avoided

Achievements

Examples:

First Jump

100 Coins

1000 Coins

5000 Score

10000 Score

Survive 10 Minutes

Perfect Run

Collector

Speed Demon

Explorer

Accessibility

Support:

High contrast mode

Colorblind-friendly palette

Keyboard-only controls

Touch controls

Reduced motion option

Adjustable sound

Polish Features

Screen shake on impact

Smooth camera movement

Floating score popups

Animated notifications

Glow effects

Bloom effects

Motion blur (light)

Responsive UI

Juicy feedback

Game Loop

Start menu

Countdown

Running begins

Obstacles spawn

Difficulty increases

Power-ups appear

Environment changes

Player dies

Game over animation

Save score

Restart instantly

Code Quality Requirements

The code should:

Be modular and object-oriented

Separate rendering, physics, audio, UI, and game logic

Use requestAnimationFrame()

Avoid duplicated code

Include descriptive variable names

Be easy to extend with new obstacles and power-ups

Follow modern JavaScript best practices

Final Goal

Build a production-quality HTML5 endless runner inspired by Google's Dino Runner, but expanded into a complete, polished arcade experience with modern visuals, fluid animations, procedural gameplay, progression systems, unlockables, achievements, responsive controls, optimized performance, and an engaging user experience that feels like a game suitable for release on a web gaming platform.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://desert-dash-dynamo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2a9f8799-412a-41ed-a320-91887f7c517a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
