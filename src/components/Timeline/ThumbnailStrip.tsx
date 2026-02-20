interface ThumbnailStripProps {
  thumbnails: string[]
}

export default function ThumbnailStrip({ thumbnails }: ThumbnailStripProps) {
  if (thumbnails.length === 0) {
    return <div className="w-full h-full rounded-md bg-white/[0.03]" />
  }

  return (
    <div className="w-full h-full flex overflow-hidden rounded-md">
      {thumbnails.map((thumb, idx) => (
        <div
          key={idx}
          className="h-full flex-shrink-0"
          style={{ width: `${100 / thumbnails.length}%` }}
        >
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}
