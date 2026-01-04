export default function ImageViewerModal({
    open,
    title,
    url,
    onClose,
}: {
    open: boolean;
    title: string;
    url: string | null;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 9999,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "min(980px, 95vw)",
                    maxHeight: "90vh",
                    background: "#fff",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid #eee",
                }}
            >
                <div
                    style={{
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #eee",
                        fontFamily: "system-ui",
                    }}
                >
                    <div style={{ fontWeight: 800 }}>{title}</div>
                    <button onClick={onClose} style={{ padding: "6px 10px", cursor: "pointer" }}>
                        ✕
                    </button>
                </div>

                <div style={{ padding: 12, overflow: "auto", background: "#fafafa", maxHeight: "75vh" }}>
                    {url ? (
                        <img
                            src={url}
                            alt={title}
                            style={{
                                width: "100%",
                                maxHeight: "70vh",
                                objectFit: "contain",
                                borderRadius: 10,
                                border: "1px solid #eee",
                                background: "#fff",
                            }}
                        />
                    ) : (
                        <div style={{ padding: 20 }}>No image</div>
                    )}
                </div>
            </div>
        </div>
    );
}
