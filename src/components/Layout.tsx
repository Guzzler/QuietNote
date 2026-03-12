export default function Layout({ center, right }: any) {
  return (
    <div className="w-[100vw] min-h-screen flex flex-col lg:flex-row gap-4 px-4 py-4 lg:px-8">
      <div className="flex-1 min-w-0">{center}</div>
      <div className="w-full lg:w-[300px] shrink-0">{right}</div>
    </div>
  );
}
