import React, { useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import provinces from "../data/provinces";
import districtEn from "../data/districtEn";
import provinceEn from "../data/provinceEn";
import * as XLSX from "xlsx";
import Select from "react-select";

registerLocale("th", th);

export default function DataPage() {
  const defaultProvince = Object.keys(provinces)[0];
  const defaultDistrict = provinces[defaultProvince][0];

  const [province, setProvince] = useState({
    label: defaultProvince,
    value: defaultProvince,
  });
  const [district, setDistrict] = useState({
    label: defaultDistrict,
    value: defaultDistrict,
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const getProvinceLabel = (prov) => prov;
  const getDistrictLabel = (prov, dist) => dist;

  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: getProvinceLabel(prov),
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({
      label: getDistrictLabel(province.value, dist),
      value: dist,
    })) || [];

  const handleFetch = async () => {
    if (!province.value || !district.value) return;
    setLoading(true);
    setData([]);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await fetch(
        `/api/weather-hourly?province=${encodeURIComponent(
          province.value
        )}&district=${encodeURIComponent(district.value)}&date=${dateStr}`
      );
      if (!res.ok) throw new Error("โหลดข้อมูลล้มเหลว");
      const json = await res.json();
      setData(json);
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeatherData");
    XLSX.writeFile(wb, "weather_data.xlsx");
  };

  return (
    <div style={{ maxWidth: 900, margin: "30px auto" }}>
      <h2>ค้นหาข้อมูลอากาศ 24 ชั่วโมง (รายวัน)</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ minWidth: 200 }}>
          <label>จังหวัด:</label>
          <Select
            options={provinceOptions}
            value={province}
            onChange={(option) => {
              setProvince(option);
              const firstDistrict = provinces[option.value]?.[0];
              setDistrict({
                label: firstDistrict,
                value: firstDistrict,
              });
            }}
            isSearchable
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <label>อำเภอ:</label>
          <Select
            options={districtOptions}
            value={district}
            onChange={setDistrict}
            isSearchable
            isDisabled={!province.value}
          />
        </div>
        <div>
          <label>วันที่:</label>
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            locale="th"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <button onClick={handleFetch} style={{ alignSelf: "end" }}>
          ค้นหา
        </button>
        <button
          onClick={handleExport}
          style={{ alignSelf: "end" }}
          disabled={!data.length}
        >
          Export Excel
        </button>
      </div>
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : data.length ? (
        <table border="1" cellPadding={6} style={{ width: "100%", fontSize: 14 }}>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ชั่วโมง</th>
              <th>อุณหภูมิ (°C)</th>
              <th>ความชื้น (%)</th>
              <th>แสงแดด (W/m²)</th>
              <th>ลม (km/h)</th>
              <th>VPD</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.date}</td>
                <td>{row.hour}</td>
                <td>{row.temp}</td>
                <td>{row.humidity}</td>
                <td>{row.solar}</td>
                <td>{row.wind}</td>
                <td>{row.vpd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
