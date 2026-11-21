import Link from "next/link";
import { appName } from "@/lib/shared";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">{appName}</h1>
      <p>
        Browse{" "}
        <Link href="/docs" className="font-medium underline">
          the documentation
        </Link>{" "}
        or ask AI to help find an answer.
      </p>
    </div>
  );
}
