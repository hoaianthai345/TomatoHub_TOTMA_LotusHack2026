export default function TasksPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">My Tasks</h1>
      <p className="text-body mb-6">
        Tasks assigned to you within campaigns
      </p>

      <div className="card-container p-6 text-center text-muted">
        <p>No tasks assigned yet...</p>
      </div>
    </div>
  );
}
