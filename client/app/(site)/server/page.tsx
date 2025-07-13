import Link from "next/link";

const Server = () => {
  return (
    <div className="h-full  flex justify-center items-center">
      <Link href={"/"} className="rounded-sm border  p-3">
        Client
      </Link>
    </div>
  );
};

export default Server;
