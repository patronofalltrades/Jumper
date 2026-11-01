# Mascot concepts

Three concept mascots for Jumper, drawn in the style of Volt (`components/art/volt.tsx`): the same outline, the same palette and a 256 by 256 view. These are concept files only. They are not used by the app yet.

## The mascots

- **Bulb** (`mascot-bulb.svg`): a light bulb with a face. Idea: light. Board part: the LED.
- **Coil** (`mascot-coil.svg`): a robot with a copper spring for a body. Idea: wire wound in a coil. Board part: the resistor.
- **Knob** (`mascot-knob.svg`): a robot with a dial on its head. Idea: turning a control. Board part: the potentiometer.

## Reuse of the existing robot avatars

We have four robot avatars already: Diode, Pixel, Servo and Chip (`public/avatars/`). Recommendation: reuse them for profile pictures only, as they are now. For the tour and the pop-ups, each mascot needs four poses (idle, happy, oops, cheer), as Volt has. Only Volt has them now. Pixel and Servo can get poses by adding arms and a new face to their existing art. Diode and Chip can stay as profile pictures.
