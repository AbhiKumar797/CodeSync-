import axios from "axios"

const pistonBaseUrl = "https://emkc.org/api/v2/piston"

const instance = axios.create({
    baseURL: pistonBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000, // Added timeout
})

export default instance