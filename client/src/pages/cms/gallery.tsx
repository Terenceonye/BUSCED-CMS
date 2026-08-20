import { ImageManagerPage } from "./image-manager";

export default function GalleryPage() {
  return (
    <ImageManagerPage
      title="Gallery"
      description="Images shown in the website gallery."
      listUrl="/api/gallery"
      uploadUrl="/api/gallery"
      deleteUrl="/api/gallery"
      maxKb={250}
    />
  );
}
