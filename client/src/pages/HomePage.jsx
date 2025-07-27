import React from "react";
import WeatherApp from "../components/WeatherApp";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import useFetchProfile from "../hooks/useFetchProfile";

export default function HomePage() {
  const [user] = useAuthState(auth);
  useFetchProfile();

  return (
    <div>
      <WeatherApp user={user} />
    </div>
  );
}
