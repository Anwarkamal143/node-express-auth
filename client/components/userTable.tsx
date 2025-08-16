export const UsersTable = ({ usersData }: { usersData: any }) => {
  const users = usersData?.data || [];

  if (!users || users.length === 0) {
    return <p>No users found.</p>;
  }

  return (
    <div>
      <h2>{usersData.message}</h2>
      <p>
        Showing {users.length} of {usersData.pagination_meta.totalRecords}{" "}
        users.
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Name</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Email</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Role</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              Created At
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              Updated At
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map(
            ({ id, name, email, role, status, created_at, updated_at }) => (
              <tr key={id}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {name}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {email}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {role}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {status}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {new Date(created_at).toLocaleString()}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {new Date(updated_at).toLocaleString()}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};
