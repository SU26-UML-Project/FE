import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@xyflow/react/dist/style.css";
import "./index.css";
import App from "./App";

/**
 * StrictMode đã được bỏ khỏi entry point.
 *
 * Ở chế độ dev, StrictMode mount mỗi component 2 lần (double-invoke effect), nên
 * MỌI trang đều gọi API 2 lượt ngay khi load: dashboard gọi
 * /projects + /sheets + /workspace-items 2 lần, Editor tạo 2 checkpoint
 * "Initial checkpoint" và join socket 2 lượt... => cảm giác trang "load lại lần
 * nữa" ngay sau khi vừa hiện nội dung, và BE bị gọi gấp đôi.
 *
 * Build production vốn KHÔNG bị double-invoke (StrictMode chỉ tác động trong
 * dev), nên bỏ đi giúp môi trường dev khớp với production.
 * Muốn bật lại các cảnh báo của React thì chỉ cần bọc <StrictMode> lại như cũ.
 */
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
