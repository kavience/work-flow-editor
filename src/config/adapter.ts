import { get } from "lodash";

export const fromApi = (data) => {
  const graphData = JSON.parse(get(data, "jsontext"));
  return {
    ...data,
    graphData,
  };
};

export const toApi = (data) => {
  return {
    ...data,
    jsontext: JSON.stringify(get(data, "graphData")),
  };
};
