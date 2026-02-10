import React from "react";
import ReactQuill from "react-quill";

const modules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"]
  ]
};

export default function ContractPreviewEditor({ html, onChange }) {
  return (
    <div className="border rounded-lg">
      <style>{`
        .contract-editor .ql-container {
          min-height: 500px;
          font-size: 14px;
          line-height: 1.6;
        }
        .contract-editor .ql-editor h2 {
          font-size: 1.2em;
          font-weight: bold;
          text-align: center;
          margin: 0.8em 0 0.5em;
        }
        .contract-editor .ql-editor h3 {
          font-weight: bold;
          font-size: 1.05em;
          margin: 1.2em 0 0.3em;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .contract-editor .ql-editor p {
          margin: 0.3em 0;
        }
      `}</style>
      <div className="contract-editor">
        <ReactQuill
          value={html || ""}
          onChange={onChange}
          modules={modules}
          theme="snow"
        />
      </div>
    </div>
  );
}