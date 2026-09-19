import Phaser from 'phaser';
import { BootScene } from '../scenes/boot-scene';
import { PreloadScene } from '../scenes/preload-scene';
import { BoardScene } from '../scenes/board-scene';
import { WeatherScene } from '../scenes/weather-scene';

/**
 * The canvas sits underneath the DOM and fills the viewport. The board scene
 * is only awake while a case is open; the weather scene runs the whole time,
 * because it is always raining in Ashgrave.
 */
export function gameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    transparent: true,
    antialias: true,
    roundPixels: false,
    fps: { target: 60, forceSetTimeOut: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      // Explicit numbers: a percentage here resolves to 0x0 on a fixed parent
      // at boot, and WebGL cannot make a framebuffer that size.
      width: Math.max(320, parent.clientWidth || window.innerWidth),
      height: Math.max(240, parent.clientHeight || window.innerHeight),
      // A hidden tab reports 0x0 on resize; never let the renderer go there.
      min: { width: 320, height: 240 },
    },
    render: { pixelArt: false, powerPreference: 'high-performance' },
    // No window-level mouse events: a click released over a DOM panel must
    // never land on the map underneath it.
    input: { activePointers: 3, windowEvents: false },
    audio: { noAudio: true }, // the room is Web Audio, in systems/audio-manager.ts
    scene: [BootScene, PreloadScene, BoardScene, WeatherScene],
  };
}
