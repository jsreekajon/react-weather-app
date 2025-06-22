import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const VPDDailyChart = React.memo(function VPDDailyChart({ weather, selectedDay }) {
 const hourlyVPDData = useMemo(() => {
  if (!weather?.days || !selectedDay) return [];

  const dayData = weather.days.find((d) => d.datetime === selectedDay);
  if (!dayData?.hours) return [];

  return dayData.hours.map((hour) => {
    const tempC = hour.temp;
    const humidity = hour.humidity;

    if (tempC == null || humidity == null) return null;

    // Saturated Vapor Pressure (SVP)
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    // Actual Vapor Pressure (AVP)
    const avp = svp * (humidity / 100);
    // Vapor Pressure Deficit (VPD)
    const vpd = parseFloat((svp - avp).toFixed(3));

    return {
      time: new Date(hour.datetimeEpoch * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      vpd,
    };
  }).filter(Boolean); // remove null
}, [weather, selectedDay]);


  return (
    <div style={{ marginTop: 40 }}>
      <h4>กราฟ VPD (รายชั่วโมงในวันที่ {selectedDay})</h4>
      {hourlyVPDData.length === 0 ? (
        <p>ไม่มีข้อมูล VPD</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={hourlyVPDData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis label={{ value: "kPa", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="vpd"
              stroke="#ff7300"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

export default VPDDailyChart;
