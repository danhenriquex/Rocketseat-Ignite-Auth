import type { NextPage } from "next";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

const Dashboard: NextPage = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    api
      .get("/me")
      .then((response) => console.log(response))
      .catch((error) => console.log(error));
  }, []);

  return <div>Dashboard: {user?.email}</div>;
};

export default Dashboard;
