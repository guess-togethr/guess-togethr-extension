import React from "react";
import { useSelector } from "react-redux";
import { userSelector } from "../store/user";

const Toolbar = () => {
  const user = useSelector(userSelector);
  return user && <div className="label-1">SUP</div>;
};

export default Toolbar;
