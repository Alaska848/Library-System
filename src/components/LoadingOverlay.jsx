export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl">
        <h2 className="text-xl font-bold">Loading...</h2>
      </div>
    </div>
  );
}
