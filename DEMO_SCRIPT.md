# Phase0 - 3 Minute Demo Script

**Duration:** 3 minutes  
**Presenters:** Person A & Person B  
**Audience:** Technical stakeholders interested in satellite mission planning

---

## **Opening (30 seconds) - Person A**

*"Today we'll demonstrate Phase0 - an AI-powered platform that transforms satellite mission planning from weeks of manual work into minutes of intelligent automation."*

**Show:** First 3 slides of presentation -- giving background on Space Mission Design & how AI will impact it.  (Maybe skip last slide)

**Show:** Dashboard with existing missions

*"Our app guides the user through the Space Mission Design process, using AWS serverless architecture with an AI agent to automate the process of defining objectives, requirements and constraints, and then proposing solutions that meet the objectives, within the constraints defined."*

---

## **Mission Creation & AI Agent (60 seconds) - Person A**

**Action:** Create new mission "Arctic Monitoring Constellation"

*"Let's create a mission to monitor Arctic ice changes. I'll just provide a brief description..."*

**Type:** *"Monitor Arctic sea ice changes with high-resolution imaging for climate research"*

**Click:** Create Mission → Open Mission Workspace

*"Watch as our AI agent automatically generates mission objectives, requirements, and constraints based on this simple description."*

**Show:** Chat with agent generating:
- Objectives (Arctic coverage, image resolution, revisit time)
- Requirements (payload specs, orbital parameters)
- Constraints (budget, mass, power limits)

*"The agent understands satellite mission domain knowledge and creates comprehensive mission frameworks in seconds."*

---

## **Design Solutions & Validation (60 seconds) - Person B**

*"Now I'll ask the agent to create design solutions that meet these requirements."*

**Chat:** *"Create 2 design solutions - one single satellite and one 3-satellite constellation"*

**Show:** Agent generating:
- Solution 1: Single satellite with high-res camera
- Solution 2: 3-satellite constellation with distributed coverage

**Navigate to:** Solutions tab → Show generated spacecraft with components

*"Each solution includes detailed spacecraft design with real components, orbital parameters, and ground stations. The agent validates requirements automatically."*

**Show:** Validation results - mass budgets, power analysis, coverage calculations

---

## **3D Visualization (45 seconds) - Person B**

**Navigate to:** Visualization tab

*"Here's where it gets exciting - real-time mission visualization."*

**Select:** 3-satellite constellation solution

**Show:** Interactive map with:
- Multiple colored satellite ground tracks
- Ground station locations
- Real orbital mechanics

*"Each satellite has its own orbital plane and ground track. The visualization uses real orbital mechanics - accounting for Earth's rotation and satellite inclination."*

**Point out:**
- Different colored tracks for each satellite
- Ground station coverage areas
- Constellation coverage patterns

*"This shows how our 3-satellite constellation provides much better revisit times and global coverage compared to a single satellite."*

---

## **Technical Architecture & Closing (25 seconds) - Person A**

*"The entire system runs on AWS serverless architecture:"*

**Show:** Architecture SVG

**Quick mention:**
- *"Cognito for authentication"*
- *"Lambda functions with AI agent"*
- *"DynamoDB for mission data"*
- *"Real orbital mechanics calculations"*

*"What traditionally takes mission planners weeks of manual calculations and iterations, our AI agent accomplishes in minutes - from concept to validated design solutions with 3D visualization."*

**Final statement:** *"This democratizes satellite mission planning, making it accessible to researchers, startups, and organizations who need space-based solutions but lack deep aerospace expertise."*

---

## **Demo Preparation Checklist**

### **Before Demo:**
- [ ] Clear browser cache and login
- [ ] Have demo mission brief ready to copy/paste
- [ ] Ensure good internet connection for map tiles
- [ ] Test agent responsiveness
- [ ] Prepare backup screenshots if needed

### **Key Demo Points:**
1. **Speed** - Minutes vs weeks
2. **Intelligence** - AI understands mission requirements
3. **Completeness** - Full mission design with validation
4. **Visualization** - Real orbital mechanics
5. **Accessibility** - No aerospace expertise required

### **Fallback Options:**
- If agent is slow: Show pre-created mission
- If visualization fails: Use screenshots
- If network issues: Focus on existing data

### **Questions to Anticipate:**
- *"How accurate are the orbital calculations?"* → Real Keplerian mechanics with Earth rotation
- *"Can it handle complex missions?"* → Show constellation with multiple ground stations
- *"What about cost estimation?"* → Component costs included in solutions
- *"Is this production ready?"* → AWS serverless, scalable architecture

---

## **Success Metrics**
- Audience understands the value proposition
- Technical feasibility is demonstrated
- AI capabilities are clearly shown
- 3D visualization impresses stakeholders
- Questions indicate genuine interest