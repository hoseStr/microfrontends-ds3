export default function StatusMessage({ msg }) {
  if (!msg) return null;
  return <div style={{ margin: "10px 0", fontWeight: 700 }}>{msg}</div>;
}
