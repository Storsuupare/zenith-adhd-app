const initiateTask = async () => {
  try {
    const response = await axios.post("http://localhost:5000/contracts", {
      userId: "test-user-123",
      taskName: "Deep Coding Session",
      durationMinutes: 30,
      stakeAmount: 500,
    });
    console.log("CONTRACT SIGNED!", response.data);
    alert("Task Initiated! Stay focused or lose 500 XP!");
  } catch (error) {
    console.error("Failed to sign contract", error);
  }
};
