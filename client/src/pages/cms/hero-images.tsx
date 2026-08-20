import { ImageManagerPage } from "./image-manager";

export default function HeroImagesPage() {
  return (
    <ImageManagerPage
      title="Hero Images"
      description="Banner images displayed at the top of the website."
      listUrl="/api/hero-images"
      uploadUrl="/api/hero-image"
      deleteUrl="/api/hero-image"
      maxKb={700}
    />
  );
}
