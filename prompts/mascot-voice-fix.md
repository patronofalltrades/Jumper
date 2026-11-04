# Mascot load and natural voice

## Prompt (Hanif)

> help debug two things:
>
> 1. When I open the website url, the mascot shows a glimpse of their 2D version before the 3D ones come in. I want it to seamlessly show the 3D version. And don't add a caption on the image. Make it clean
> 2. The voice read out is quite robotic, any way to circumvent that?

## Changes

1. `components/landing/mascot-band.tsx`: the 2D stand-in and the hint caption are removed. Only the green glow shows until the 3D scene loads.
   `components/mascots-3d/stage.tsx`: the canvas fades in after its first frame is drawn.
2. `lib/game/voice.ts` (with `tests/voice.test.ts`): chooses the most natural English voice of the browser (Edge "Natural", Chrome "Google", Safari "Enhanced" or "Premium") and not the robotic default. `components/build/alive-audio.ts` uses it, at rate 0.95.
