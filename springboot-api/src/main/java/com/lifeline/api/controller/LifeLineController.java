package com.lifeline.api.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class LifeLineController {

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
            "application", "LifeLine AI",
            "module", "Spring Boot REST API",
            "status", "Running",
            "version", "1.0.0",
            "server", "Embedded Apache Tomcat",
            "timestamp", LocalDateTime.now()
        );
    }

    @GetMapping("/hospitals")
    public List<Map<String, Object>> getHospitals() {
        return List.of(
            Map.of(
                "id", 1,
                "name", "Apollo Hospital",
                "location", "Hyderabad",
                "status", "Available"
            ),
            Map.of(
                "id", 2,
                "name", "Care Hospital",
                "location", "Hyderabad",
                "status", "Available"
            ),
            Map.of(
                "id", 3,
                "name", "Yashoda Hospital",
                "location", "Hyderabad",
                "status", "Available"
            ),
            Map.of(
                "id", 4,
                "name", "City Hospital",
                "location", "Hyderabad",
                "status", "Available"
            )
        );
    }

    @GetMapping("/drivers")
    public List<Map<String, Object>> getDrivers() {
        return List.of(
            Map.of(
                "id", 1,
                "name", "Rahul",
                "vehicleNumber", "TS09AB1001",
                "status", "Available"
            ),
            Map.of(
                "id", 2,
                "name", "Arjun",
                "vehicleNumber", "TS09AB1002",
                "status", "Busy"
            ),
            Map.of(
                "id", 3,
                "name", "Sameer",
                "vehicleNumber", "TS09AB1003",
                "status", "Available"
            )
        );
    }
}