import React from "react";

export default function FancyNavButton({
  text,
  icon,
  active = false,
  onClick,
  disabled = false,
}: {
  text: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <style>{`
        /* Adopted from provided top-navigation CSS */
        .btn-nav{
          color: #004C97 !important;
          font-weight: 600;
          border-radius: 12px;
          margin: 0 6px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          padding: 21px 16px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px;
          background: transparent;
          border: 0;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-nav[disabled]{ opacity: .45; cursor: not-allowed; }

        .btn-nav:hover{
          color: #E32636 !important;
          background: rgba(227, 38, 54, 0.08) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(227, 38, 54, 0.15);
        }

        .btn-nav.is-active{
          color: #ffffff !important;
          background: linear-gradient(135deg, #E32636 0%, #004C97 100%) !important;
          transform: translateY(-2px);
        }

        /* small circular icon to the left */
        .btn-nav .nb-icon{
          display:inline-flex; align-items:center; justify-content:center; font-size:16px;
          width:36px; height:36px; border-radius:50%;
          background: rgba(255,255,255,0.06); color: #E32636;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.06); transition: all .25s;
        }

        .btn-nav.is-active .nb-icon{ background: rgba(255,255,255,0.14); color: #fff; box-shadow: none; }
      `}</style>

      <button
        type="button"
        className={`btn-nav ${active ? "is-active" : ""}`}
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled}
      >
        {icon ? <span className="nb-icon">{icon}</span> : null}
        {text}
      </button>
    </>
  );
}
