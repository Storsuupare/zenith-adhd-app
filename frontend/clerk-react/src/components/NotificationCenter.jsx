import React from "react";
import "./NotificationCenter.css";

const NotificationCenter = ({ notifications }) => {
  if (!notifications?.length) return null;
  return (
    <div className="notification-center">
      {notifications.map((n) => (
        <div key={n.id} className={`notification-item ${n.type.toLowerCase()}`}>
          <div className="notif-accent" />
          <div className="notif-content">
            <span className="notif-text">{n.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;