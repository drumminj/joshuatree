// Dependencies: NONE

// Class which represents a single animation
class Animation {
    constructor(startVal, endVal, duration, easing, onUpdate, onComplete) {
        this._startVal = startVal;
        this._endVal = endVal;
        this._easing = Animation.easingEquations[easing];
        this._durationMS = duration * 1000;
        this._onUpdate = onUpdate;
        this._onComplete = onComplete;

        this._startTime = Math.floor(window.performance.now());
    }

    update(now) {
        const p = (now - this._startTime) / this._durationMS;
        const t = this._easing(p);

        if (p < 1) {
            const delta = this._endVal - this._startVal;
            this._onUpdate(this._startVal + (delta * t))
            return false;
        } else {
            this._onUpdate(this._endVal);
            if (this._onComplete) {
                this._onComplete();
            }
            return true;
        }
    };
}

// easing equations from https://github.com/danro/easing-js/blob/master/easing.js
Animation.easingEquations = {
    linear: pos => pos,
    easeOutSine: pos => Math.sin(pos * Math.PI / 2),
    easeInOutSine: pos => (-0.5 * (Math.cos(Math.PI * pos) - 1)),
    easeInQuint: pos => Math.pow(pos, 5),
};

class AnimationManager {
    constructor() {
        this._animations = [];
        this._requestId = 0;

        this._updateAnimations = this._updateAnimations.bind(this)
    }

    // main interface for creating new animations, which will be run by the manager
    createAnimation(startVal, endVal, duration, easing, onUpdate, onComplete) {
        const animation = new Animation(startVal, endVal, duration, easing, onUpdate, onComplete);
        this._animations.push(animation);

        // if update not already pending, schedule one
        this._requestId = this._requestId || window.requestAnimationFrame(this._updateAnimations);
    }

    _updateAnimations() {
        // request next animation frame immediately, even though all animations may complete
        this._requestId = window.requestAnimationFrame(this._updateAnimations);
        const now = Math.floor(window.performance.now());

        // iterate through and update our pending animations
        const continuingAnimations = [];
        for (const animation of this._animations) {
            if (animation.update(now) === false)
                continuingAnimations.push(animation);
        }

        this._animations = continuingAnimations;

        // cancel animation frame if all animations have updated
        if (this._animations.length === 0) {
            window.cancelAnimationFrame(this._requestId);
            this._requestId = 0;
        }
    };
};

// singleton animation manager
const animationManager = new AnimationManager();
