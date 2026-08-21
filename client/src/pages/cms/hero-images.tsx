import { ImageManagerPage } from "./image-manager";

export default function HeroImagesPage() {
  return (
    <ImageManagerPage
      title="Hero Images"
      description="Banner images displayed at the top of the website."
      listUrl="/api/v1/hero-images"
      uploadUrl="/api/v1/hero-image"
      deleteUrl="/api/v1/hero-image"
      maxKb={700}
    />
  );
}
