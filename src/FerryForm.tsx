// @ts-nocheck
import React, { useState, useRef } from "react";
import dayjs from "dayjs";
import Plot from "react-plotly.js";
import {
  Container,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  FormGroup,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DownloadIcon from "@mui/icons-material/Download";

const currentDate = new Date();
const formattedDate = currentDate.toISOString().split("T")[0];

let energyCostForTrip = 0;
// Layout configuration
const layout = {
  title: {
    text: "Battery Capacity Over Time",
    font: {
      family: "Arial, sans-serif",
      size: 24,
      color: "#333",
    },
  },
  xaxis: {
    title: "Time",
    type: "date",
    tickformat: "%H:%M",
    tickmode: "linear",
    showgrid: false,
    range: [formattedDate + " 04:00:00", formattedDate + " 23:59:00"],
    dtick: 86400000.0 / 24,
    tickfont: {
      family: "Arial, sans-serif",
      size: 12,
      color: "black",
    },
  },
  yaxis: {
    title: "Battery Capacity (kWh)",
    type: "linear",
    zeroline: true,
    showgrid: false,
    tickfont: {
      family: "Arial, sans-serif",
      size: 12,
      color: "black",
    },
  },
  plot_bgcolor: "#f8f9fa", // Light gray background, Bootstrap's light background color
  paper_bgcolor: "#fff", // White background for the plotting area
  margin: { t: 60, b: 100, l: 60, r: 60 }, // Adjust margins to prevent clipping
};

function FerryFormMUI() {
  const [formData, setFormData] = useState({
    ferryName: "",
    engineCapacity: "",
    ferrySpeed: "",
    distance: "",
    fastChargingPower: "",
    bufferCapacity: "",
    maxFastCharging: "",
    maxNonStopTrips: "", // New field
    chargeAtPort1: false,
    chargeAtPort2: false,
    schedules: [{ time: "", port: "" }],
    minFastChargeTime: "",
  });
  const [showPlot, setShowPlot] = useState(false); // State to control plot visibility
  const [batteryCapacity, setBatteryCapacity] = useState(0);
  const [bufferCapacity, setBufferCapacity] = useState(0);
  const [perTripEnergy, setPerTripEnergy] = useState(0);
  const [plotData, setPlotData] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  function calculateBatteryCapacity(formData: any) {
    const {
      engineCapacity,
      distance,
      ferrySpeed,
      bufferCapacity,
      maxFastCharging,
      maxNonStopTrips,
    } = formData;
    const speed = parseFloat(ferrySpeed);
    const nonStopTrips = parseFloat(maxNonStopTrips);
    const distancePerTrip = parseFloat(distance);
    const engineCap = parseFloat(engineCapacity);
    const bufferPercent = parseFloat(bufferCapacity) / 100; // Convert percent to decimal
    const maxFastChargingPercent = parseFloat(maxFastCharging) / 100; // Convert percent to decimal

    // Ensure all values are valid numbers to avoid NaN results
    if (
      isNaN(speed) ||
      isNaN(distancePerTrip) ||
      isNaN(engineCap) ||
      isNaN(bufferPercent) ||
      isNaN(maxFastChargingPercent) ||
      isNaN(nonStopTrips)
    ) {
      return undefined; // Or handle error appropriately
    }

    // Calculate Route Transit Energy Requirement in kWh
    const routeTransitEnergyRequirement = (engineCap * distancePerTrip) / speed;
    console.log(
      "Route Transit Energy Requirement in kWh:",
      routeTransitEnergyRequirement
    );
    // Calculate Total Battery Capacity in kWh
    const totalBatteryCapacity =
      (nonStopTrips * routeTransitEnergyRequirement) /
      (maxFastChargingPercent - bufferPercent);
    setBatteryCapacity(totalBatteryCapacity);
    setBufferCapacity(totalBatteryCapacity * bufferPercent);
    setPerTripEnergy(routeTransitEnergyRequirement);
    energyCostForTrip = routeTransitEnergyRequirement;
    return {
      totalBatteryCapacity,
      bufferCapacity: totalBatteryCapacity * bufferPercent,
      perTripEnergy,
    }; // Return the total battery capacity in kWh
  }

  const getOtherPort = (currentPort: number) => {
    if (currentPort === 1) {
      return 2;
    } else {
      return 1;
    }
  };

  // Helper function to calculate time difference in minutes using dayjs
  const getTimeDifferenceInMinutes = (startTime, endTime) => {
    const start = dayjs(`2023-01-01T${startTime}:00.000Z`); // Arbitrary date, only time is relevant
    const end = dayjs(`2023-01-01T${endTime}:00.000Z`);
    const diff = end.diff(start, "minute");
    return diff;
  };

  const addTime = (startTime, hours) => {
    const start = dayjs(`2023-01-01T${startTime}:00.000`); // Treat the time as local
    const minutesToAdd = Math.round(hours * 60); // Convert hours to minutes, rounding to nearest whole number for precision
    const newTime = start.add(minutesToAdd, "minute"); // Use "minute" to add the time
    return newTime.format("HH:mm");
  };

  const roundOff = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  const calculatePlotData = (
    formData: any,
    totalBatteryCapacity: any,
    perTripEnergy: any,
    bufferBattery: any
  ) => {
    const {
      schedules,
      distance,
      ferrySpeed,
      fastChargingPower,
      chargeAtPort1,
      chargeAtPort2,
      maxFastCharging,
      minFastChargeTime,
    } = formData;

    const scheduleData = schedules.map((schedule: any) => ({
      x: schedule.time,
      y: schedule.port,
    }));
    const speed = parseFloat(ferrySpeed);
    const distancePerTrip = parseFloat(distance);
    const chargingPower = parseFloat(fastChargingPower);
    const maxFastChargingPercent = parseFloat(maxFastCharging) / 100;
    const minFastChargeTimeMinutes = parseFloat(minFastChargeTime);
    scheduleData.sort((a: any, b: any) => a.x.localeCompare(b.x));

    const plotData: any[] = [];

    let currentBatteryCapacity = totalBatteryCapacity;
    let currentPort = null;
    let currentTime = null;
    let index = 0;
    for (const element of scheduleData) {
      currentPort = element.y;
      currentTime = element.x;
      if (currentBatteryCapacity < bufferBattery) continue;
      // trip start
      plotData.push({
        time: currentTime,
        batteryCapacity: currentBatteryCapacity,
        port: currentPort,
      });
      console.log("Inserted Trip Start", currentTime, currentBatteryCapacity);

      //add trip end
      currentTime = addTime(currentTime, distancePerTrip / speed);
      console.log("Trip End", currentTime, distancePerTrip / speed);
      currentPort = getOtherPort(currentPort);
      currentBatteryCapacity = roundOff(
        currentBatteryCapacity - energyCostForTrip
      );
      if (currentBatteryCapacity < bufferBattery) continue;
      plotData.push({
        time: currentTime,
        batteryCapacity: currentBatteryCapacity,
        port: currentPort,
      });

      const nextElement = scheduleData[index + 1];
      if (
        (currentPort === 1 && chargeAtPort1) ||
        (currentPort === 2 && chargeAtPort2)
      ) {
        if (
          currentBatteryCapacity <
          maxFastChargingPercent * totalBatteryCapacity
        ) {
          if (nextElement) {
            //fast charge for time left - 5 min buffer
            const potentialChargeTime = getTimeDifferenceInMinutes(
              currentTime,
              nextElement.x
            );

            if (potentialChargeTime > minFastChargeTimeMinutes) {
              const maxCharge = roundOff(
                maxFastChargingPercent * totalBatteryCapacity
              );
              const newCharge = roundOff(
                (chargingPower * potentialChargeTime) / 60 +
                  currentBatteryCapacity
              );
              // y2-y1 = chargingPower*(x2-x1)
              // x2 = y2-y1/chargingPower + x1
              if (maxCharge < newCharge) {
                currentTime = addTime(
                  currentTime,
                  (maxCharge - currentBatteryCapacity) / chargingPower
                );
                currentBatteryCapacity = maxCharge;
              } else {
                currentBatteryCapacity = newCharge;
                currentTime = addTime(
                  currentTime,
                  (newCharge - currentBatteryCapacity) / chargingPower
                );
              }

              plotData.push({
                time: currentTime,
                batteryCapacity: currentBatteryCapacity,
                port: currentPort,
              });
            }
          }
        }
      }

      index++;
    }
    let adjustedData = JSON.parse(JSON.stringify(plotData)); // Clone to avoid mutating original data
    let remainingDiff =
      plotData[plotData.length - 1].batteryCapacity - bufferBattery;

    // Iterate backwards to find charging starts
    for (let i = adjustedData.length - 1; i > 0 && remainingDiff > 0; i--) {
      // Identify a charging start by a drop in capacity as we go backwards
      if (
        adjustedData[i].batteryCapacity > adjustedData[i - 1].batteryCapacity
      ) {
        // Calculate the amount charged in this session
        let chargeAmount =
          adjustedData[i].batteryCapacity - adjustedData[i - 1].batteryCapacity;
        let amtToReduce = 0;
        // If reducing this session's charge amount by remainingDiff doesn't go below 0
        if (chargeAmount - remainingDiff > 0) {
          amtToReduce = remainingDiff;
        } else {
          amtToReduce = chargeAmount;
        }
        // Adjust the post-charge battery capacity
        for (let j = adjustedData.length - 1; j >= i; j--) {
          const newVal = adjustedData[j].batteryCapacity - amtToReduce;
          adjustedData[j].batteryCapacity = newVal;
          if (j == i) {
            const updatedTime = addTime(
              adjustedData[j - 1].time,
              (newVal - adjustedData[j - 1].batteryCapacity) / chargingPower
            );
            adjustedData[j].time = updatedTime;
          }
        }
        remainingDiff -= amtToReduce;
      }
    }

    adjustedData.unshift({
      time: `00:00`,
      batteryCapacity: adjustedData[0].batteryCapacity,
      port: adjustedData[0].port,
    });

    const formattedData = [
      {
        x: adjustedData.map((item) => `${formattedDate} ${item.time}:00`), // Time values for the x-axis
        y: adjustedData.map((item) => item.batteryCapacity), // Battery capacity values for the y-axis
        type: "scatter",
        mode: "lines+markers",
        name: "Battery capacity",
        marker: { color: "#007bff" }, // Using Bootstrap primary color
        line: {
          color: "#007bff",
          width: 3,
        },
      },
      {
        x: [`${formattedDate} 00:00:00`, `${formattedDate} 23:59:00`],
        y: [
          maxFastChargingPercent * totalBatteryCapacity,
          maxFastChargingPercent * totalBatteryCapacity,
        ],
        type: "scatter",
        mode: "lines",
        line: {
          color: "black",
          width: 2,
          dash: "dash",
        },
        name: maxFastCharging + "% capacity",
      },
      {
        x: [`${formattedDate} 00:00:00`, `${formattedDate} 23:59:59`],
        y: [bufferBattery, bufferBattery],
        type: "scatter",
        mode: "lines",
        line: {
          color: "red",
          width: 2,
          dash: "dash",
        },
        name: `Buffer capacity`,
      },
    ];
    setPlotData(JSON.parse(JSON.stringify(formattedData)));
    return plotData;
  };

  const handleDownloadInputJSON = (e: Event) => {
    const formDataJson = JSON.stringify(formData);
    console.log("Form Data JSON:", formDataJson);
    var a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([formDataJson], { type: "application/json" })
    );
    a.download = "ferryInputData.json";
    a.click();
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const formDataJson = JSON.stringify(formData);
    const totalBatteryCapacity = calculateBatteryCapacity(formData);
    console.log("Total Battery Capacity in kWh:", totalBatteryCapacity);
    if (!totalBatteryCapacity) return;
    calculatePlotData(
      formData,
      roundOff(totalBatteryCapacity.totalBatteryCapacity),
      roundOff(totalBatteryCapacity.perTripEnergy),
      roundOff(totalBatteryCapacity.bufferCapacity)
    );
    // If you need to send this data to a server, this is where you would do it.
  };

  const handleScheduleChange = (index: number, e: Event) => {
    const { name, value }: any = e.target;
    const updatedSchedules = formData.schedules.map((schedule, i) => {
      if (i === index) {
        return { ...schedule, [name]: value };
      }
      return schedule;
    });
    setFormData({ ...formData, schedules: updatedSchedules });
  };

  const handleAddSchedule = () => {
    setFormData({
      ...formData,
      schedules: [...formData.schedules, { time: "", port: "" }],
    });
  };

  const handleRemoveSchedule = (index: number) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.filter((_, i) => i !== index),
    });
  };

  const handleUpload = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      const fileContents = JSON.parse(e.target.result);
      setFormData(fileContents);
    };
  };

  return (
    <>
      <Container maxWidth="sm">
        <Button
          variant="contained"
          component="label"
          style={{ marginTop: "1rem" }}
        >
          Upload Ferry Data JSON
          <input
            type="file"
            hidden
            onChange={handleUpload}
            ref={fileInputRef}
            accept=".json"
          />
        </Button>
        <br />
        <br />
        <Typography variant="h7" gutterBottom>
          OR
        </Typography>
        <form onSubmit={handleSubmit}>
          <br />
          <Typography variant="h6" gutterBottom>
            Ferry Data
          </Typography>
          <TextField
            label="Ferry Name"
            variant="outlined"
            fullWidth
            margin="normal"
            name="ferryName"
            type="text"
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.ferryName}
            onChange={handleChange}
          />
          <TextField
            label="Engine Capacity (kW)"
            variant="outlined"
            fullWidth
            margin="normal"
            name="engineCapacity"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.engineCapacity}
            onChange={handleChange}
          />
          <TextField
            label="Ferry Speed (NM/h)"
            variant="outlined"
            fullWidth
            margin="normal"
            name="ferrySpeed"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.ferrySpeed}
            onChange={handleChange}
          />
          <TextField
            label="Distance per trip (NM)"
            variant="outlined"
            fullWidth
            margin="normal"
            name="distance"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.distance}
            onChange={handleChange}
          />

          <Typography variant="h6" gutterBottom style={{ marginTop: "1rem" }}>
            Battery Data
          </Typography>
          <TextField
            label="Buffer Capacity in %"
            variant="outlined"
            fullWidth
            margin="normal"
            name="bufferCapacity"
            type="number"
            value={formData.bufferCapacity}
            onChange={handleChange}
          />
          <TextField
            label="Max Fast Charging %"
            variant="outlined"
            fullWidth
            margin="normal"
            name="maxFastCharging"
            type="number"
            value={formData.maxFastCharging}
            onChange={handleChange}
          />

          <Typography variant="h6" gutterBottom style={{ marginTop: "1rem" }}>
            Charging Data
          </Typography>
          <TextField
            label="Max Non-Stop Trips"
            variant="outlined"
            fullWidth
            margin="normal"
            name="maxNonStopTrips"
            type="number"
            InputProps={{ inputProps: { min: 0 } }} // Ensure non-negative integers
            value={formData.maxNonStopTrips}
            onChange={handleChange}
          />
          <TextField
            label="Fast Charging Power (kW)"
            variant="outlined"
            fullWidth
            margin="normal"
            name="fastChargingPower"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.fastChargingPower}
            onChange={handleChange}
          />
          <TextField
            label="Minimum Fast Charge Time (minutes)"
            variant="outlined"
            fullWidth
            margin="normal"
            name="minFastChargeTime"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.minFastChargeTime}
            onChange={handleChange}
          />
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  name="chargeAtPort1"
                  checked={formData.chargeAtPort1}
                  onChange={handleChange}
                />
              }
              label="Charge at Port 1"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="chargeAtPort2"
                  checked={formData.chargeAtPort2}
                  onChange={handleChange}
                />
              }
              label="Charge at Port 2"
            />
          </FormGroup>
          <Typography variant="h6" gutterBottom style={{ marginTop: "1rem" }}>
            Schedules
          </Typography>
          {formData.schedules.map((schedule, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <TextField
                label="Time (HH:MM)"
                variant="outlined"
                name="time"
                type="time"
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300, // 5 min
                }}
                value={schedule.time}
                onChange={(e) => handleScheduleChange(index, e)}
                style={{ marginRight: "1rem" }}
              />
              <FormControl
                variant="outlined"
                style={{ marginRight: "1rem", minWidth: "10rem" }}
              >
                <InputLabel>Departure Port</InputLabel>
                <Select
                  label="Port"
                  name="port"
                  value={schedule.port}
                  onChange={(e) => handleScheduleChange(index, e)}
                >
                  <MenuItem value={1} default>
                    Port 1
                  </MenuItem>
                  <MenuItem value={2}>Port 2</MenuItem>
                </Select>
              </FormControl>
              {formData.schedules.length > 1 && (
                <IconButton onClick={() => handleRemoveSchedule(index)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </div>
          ))}
          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleAddSchedule}
            style={{ marginBottom: "1rem", float: "left" }}
          >
            Add Schedule
          </Button>
          <br />
          <br />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "1rem",
            }}
          >
            <Button
              type="button"
              onClick={handleDownloadInputJSON}
              startIcon={<DownloadIcon />}
              variant="contained"
              color="secondary"
            >
              Download Input JSON
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />} // Add your icon here
              style={{ marginLeft: "1rem" }}
            >
              Run Analysis
            </Button>
          </div>
        </form>
        <hr />
      </Container>
      <Container>
        <div style={{ width: "100%" }}>
          {plotData && (
            <>
              <Typography
                variant="h2"
                gutterBottom
                style={{ marginTop: "1rem" }}
              >
                Analysis
              </Typography>

              <Typography
                variant="h4"
                gutterBottom
                style={{ marginTop: "1rem" }}
              >
                Total battery capacity: {roundOff(batteryCapacity)} kWh
              </Typography>

              <Typography
                variant="h4"
                gutterBottom
                style={{ marginTop: "1rem" }}
              >
                Per trip energy: {roundOff(perTripEnergy)} kWh
              </Typography>
              <br />

              <Plot
                data={plotData}
                layout={layout}
                style={{ width: "100%", height: "600px" }} // Increased height for a bigger chart
                useResizeHandler={true} // Ensures that the plot is responsive
              />
            </>
          )}
        </div>
      </Container>
    </>
  );
}

export default FerryFormMUI;

