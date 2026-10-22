import file from "@/content/videos.json";
import type { DeviceKind } from "@/lib/device";

// The recorded walkthrough videos (issue #49): recordings of the 3D replay clips (issue #48), in public/videos/.
// Their names, titles and captions are in content/videos.json.

export type Video = { id: string; title: string; caption: string; project?: string; level?: number };

export const videos: Video[] = file.videos;

/** The folder of the files, in public/. */
export const VIDEO_DIR = "videos";

/** Each video has one file for each size: phone and laptop. */
export const VIDEO_SIZES = Object.keys(file.sizes) as DeviceKind[];

export const videoSrc = (id: string, size: DeviceKind) => `/${VIDEO_DIR}/${id}-${size}.webm`;

export const levelVideo = (project: string, level: number) => videos.find((v) => v.project === project && v.level === level);

export const introVideo = () => videos.find((v) => v.id === "intro");
