import { appIcon } from "@/lib/appIcon";

// iPhone home-screen icon: the lash logo on deep brown (iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(180);
}
