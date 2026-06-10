export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* TODO: Add Navbar */}
      <main className="flex-1">{children}</main>
      {/* TODO: Add Footer */}
    </>
  );
}
