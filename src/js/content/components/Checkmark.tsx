import React from "react";
import { makeStyles } from "@material-ui/core";

interface CheckmarkProps {
  checked?: boolean;
}

const SIZE = 30;
const adjustSize = (original: number) => (original / 80) * SIZE;

const useStyles = makeStyles({
  checked: {},
  checkIcon: {
    width: SIZE,
    height: SIZE,
    position: "relative",
    borderRadius: "50%",
    boxSizing: "content-box",
    border: "4px solid #4CAF50",
    "&::before": {
      top: -5,
      left: -4,
      width: adjustSize(30),
      transformOrigin: `${SIZE / 2 + 4}px 50%`,
      borderRadius: `${SIZE * 1.25}px 0 0 ${SIZE * 1.25}px`,
    },
    "&::after": {
      // top: -5,
      left: adjustSize(30) - 5,
      width: adjustSize(60) + 6,
      transformOrigin: `${SIZE / 2 - adjustSize(30) + 5}px 50%`,
      borderRadius: `0 ${SIZE * 1.25}px ${SIZE * 1.25}px 0`,
    },
    "&::before, &::after": {
      content: '""',
      top: -6,
      height: SIZE + 12,
      position: "absolute",
      background: "#ffffff",
      transform: "rotate(-45deg)",
    },
    "&$checked::after": {
      animation: "$rotateCircle 4.25s ease-in",
    },
  },
  iconLine: {
    height: adjustSize(8),
    backgroundColor: "#4caf50",
    display: "block",
    borderRadius: 2,
    position: "absolute",
    zIndex: 10,
  },
  lineTip: {
    top: adjustSize(46),
    left: adjustSize(14),
    width: 0,
    transform: "rotate(45deg)",
    "$checkIcon$checked > &": {
      animation: "$iconLineTip 0.75s",
      width: adjustSize(25),
    },
  },
  lineLong: {
    top: adjustSize(38),
    right: adjustSize(8),
    width: 0,
    transform: "rotate(-45deg)",
    "$checkIcon$checked > &": {
      animation: "$iconLineLong 0.75s",
      width: adjustSize(47),
    },
  },
  iconCircle: {
    top: -4,
    left: -4,
    zIndex: 10,
    width: SIZE,
    height: SIZE,
    borderRadius: "50%",
    position: "absolute",
    boxSizing: "content-box",
    border: "4px solid rgb(200,200,200)",
    transition: "border-color 1s",
    "$checkIcon$checked > &": {
      borderColor: "rgba(76,175,80,0.5)",
    },
  },
  iconFix: {
    top: adjustSize(8),
    width: adjustSize(5),
    left: adjustSize(26),
    zIndex: 1,
    height: adjustSize(85),
    position: "absolute",
    transform: "rotate(-45deg)",
    backgroundColor: "#ffffff",
  },
  "@keyframes rotateCircle": {
    "0%": {
      transform: "rotate(-45deg)",
    },
    "5%": {
      transform: "rotate(-45deg)",
    },
    "12%": {
      transform: "rotate(-405deg)",
    },
    "100%": {
      transform: "rotate(-405deg)",
    },
  },
  "@keyframes iconLineTip": {
    "0%": {
      width: adjustSize(0),
      left: adjustSize(1),
      top: adjustSize(19),
    },
    "54%": {
      width: adjustSize(0),
      left: adjustSize(1),
      top: adjustSize(19),
    },
    "70%": {
      width: adjustSize(50),
      left: adjustSize(-8),
      top: adjustSize(37),
    },
    "84%": {
      width: adjustSize(17),
      left: adjustSize(21),
      top: adjustSize(48),
    },
    "100%": {
      width: adjustSize(25),
      left: adjustSize(14),
      top: adjustSize(45),
    },
  },
  "@keyframes iconLineLong": {
    "0%": {
      width: adjustSize(0),
      right: adjustSize(46),
      top: adjustSize(54),
    },
    "65%": {
      width: adjustSize(0),
      right: adjustSize(46),
      top: adjustSize(54),
    },
    "84%": {
      width: adjustSize(55),
      right: adjustSize(0),
      top: adjustSize(35),
    },
    "100%": {
      width: adjustSize(47),
      right: adjustSize(8),
      top: adjustSize(38),
    },
  },
});

const Checkmark: React.FunctionComponent<CheckmarkProps> = ({ checked }) => {
  const classes = useStyles();
  return (
    <div className={`${classes.checkIcon} ${checked ? classes.checked : ""}`}>
      <span className={`${classes.iconLine} ${classes.lineTip}`} />
      <span className={`${classes.iconLine} ${classes.lineLong}`} />
      <div className={classes.iconCircle} />
      <div className={classes.iconFix} />
    </div>
  );
};

export default Checkmark;
