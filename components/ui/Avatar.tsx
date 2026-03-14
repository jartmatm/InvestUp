import React from "react";

type AvatarProps = {
  src: string;
  size?: number;
  alt?: string;
};

export function Avatar({ src, size = 48, alt = "Avatar" }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
