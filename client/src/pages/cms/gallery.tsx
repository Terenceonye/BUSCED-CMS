import { ImageManagerPage } from "./image-manager";

export default function GalleryPage() {
  return (
    <ImageManagerPage
      title="Gallery"
      description="Images shown in the website gallery."
      listUrl="/api/v1/gallery"
      uploadUrl="/api/v1/gallery"
      deleteUrl="/api/v1/gallery"
      maxKb={250}
    />
  );
}
