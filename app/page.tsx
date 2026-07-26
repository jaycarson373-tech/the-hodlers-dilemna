import { HomeShow } from "@/components/home-show";

export default function Home() {
  return <HomeShow launchState={process.env.LAUNCH_STATE === "live" ? "live" : "prelaunch"} />;
}
