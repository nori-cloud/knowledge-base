export function Video({ src, label }: { src: string; label: string }) {
  return (
    // biome-ignore lint/a11y/useMediaCaption: Footage has no audio track to caption; the surrounding record describes it.
    <video
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      className="my-6 aspect-video w-full rounded-lg border bg-black"
    >
      <source src={src} type="video/mp4" />
      <a href={src}>Open the video</a>
    </video>
  );
}
