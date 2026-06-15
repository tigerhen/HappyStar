import React from "react";

export default function Avatar({ avatar, emoji, size = 40, style }) {
  if (avatar && avatar.startsWith("/")) {
    return (
      <img
        src={avatar}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          background: "#fff",
          display: "block",
          ...style,
        }}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: Math.round(size * 0.55),
        lineHeight: 1,
        ...style,
      }}
    >{emoji || "👤"}</span>
  );
}
