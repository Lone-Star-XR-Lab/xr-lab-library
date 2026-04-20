function app(){
  return {
    DATA: [],
    VIDEOS: [],
    activeTab: 'apps',
    appsReady: false,
    videosReady: false,
    query: '',
    videoQuery: '',
    sortMode: 'az',
    videoSortMode: 'az',
    videoDepartment: '',
    quickPills: new Set(),
    detailsOpen: {},
    approvedOnly: false,
    installedOnly: false,
    selectedDepartments: new Set(),
    selectedDurableSkills: new Set(),
    selectedComfort: new Set(),
    selectedInput: new Set(),
    selectedDevices: new Set(),
    selectedAge: new Set(),
    skillDefinitions: {
      'adaptability': 'Adjusting to new tools, environments, feedback, or changing conditions without losing momentum.',
      'collaboration': 'Working productively with others to plan, build, review, or learn together toward a shared goal.',
      'communication': 'Expressing ideas clearly so other people can understand, respond, and act on them.',
      'creative expression': 'Using artistic or imaginative choices to communicate ideas, perspectives, or emotions.',
      'critical thinking': 'Evaluating information, assumptions, and evidence to make sound judgments or interpretations.',
      'cultural awareness': 'Recognizing how history, identity, context, and lived experience shape people and communities.',
      'decision-making': 'Choosing a course of action by weighing options, tradeoffs, timing, and consequences.',
      'design thinking': 'Exploring problems through user needs, iteration, prototyping, and intentional design choices.',
      'digital fluency': 'Using digital tools confidently and understanding how to navigate interactive technology effectively.',
      'empathy': 'Understanding another person’s perspective, feelings, or lived experience and responding thoughtfully.',
      'problem solving': 'Identifying challenges, testing approaches, and improving solutions when something is unclear or broken.',
      'professional communication': 'Communicating in a clear, appropriate, and audience-aware way for academic or workplace settings.',
      'public speaking': 'Presenting ideas aloud with clarity, confidence, pacing, and awareness of an audience.',
      'scientific observation': 'Noticing patterns, structures, behaviors, or evidence carefully in order to support inquiry and analysis.',
      'self-awareness': 'Recognizing your own emotions, habits, strengths, and limits while working or learning.',
      'self-confidence': 'Trusting your ability to participate, present, practice, and improve through repeated effort.',
      'self-directed learning': 'Taking initiative to explore, practice, and build understanding without constant external direction.',
      'self-management': 'Managing focus, effort, emotions, and behavior in order to work effectively and persist.',
      'self-reflection': 'Looking back on your performance or experience to identify what worked, what did not, and what to change.',
      'situational awareness': 'Reading the environment, timing, and other people’s actions so you can respond effectively in the moment.',
      'spatial reasoning': 'Understanding how objects, layouts, movement, and scale relate in three-dimensional space.',
      'systems thinking': 'Seeing how parts of a process or system interact and how changes in one area affect another.',
      'teamwork': 'Contributing responsibly within a group by coordinating roles, actions, and support for others.',
      'technical literacy': 'Understanding how technical systems, interfaces, or tools function well enough to use them purposefully.',
      'visual communication': 'Using images, layouts, forms, and visual choices to convey meaning clearly.'
    },
    get apps(){ return this.DATA; },

    toText(value){
      if(Array.isArray(value)) return value.map(this.toText.bind(this)).join(' ');
      return value == null ? '' : String(value);
    },
    parseDepts(value){
      if(Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
      if(typeof value === 'string') return value.split(/[,\|\/;]+/).map(v => v.trim()).filter(Boolean);
      return [];
    },
    parseList(value){
      if(Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
      if(typeof value === 'string') return value.split(/[,\|\/;]+/).map(v => v.trim()).filter(Boolean);
      if(value == null) return [];
      const str = this.toText(value).trim();
      return str ? [str] : [];
    },
    formatFacetLabel(raw){
      const cleaned = String(raw).trim().replace(/\s+/g,' ');
      if(!cleaned) return '';
      return cleaned.split(' ').map(word => {
        if(/^[A-Z0-9]{2,}$/.test(word)) return word.toUpperCase();
        return word.split('-').map(part => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part).join('-');
      }).join(' ');
    },

    baseCandidates(){
      const q = this.query.trim().toLowerCase();
      const matchesPills = (app) => {
        for(const pill of this.quickPills){
          if(!this.facet(app, pill)) return false;
        }
        return true;
      };
      return this.apps
        .filter(app => this.visibleInLibrary(app))
        .filter(matchesPills)
        .filter(app => !this.approvedOnly || app.approved === true)
        .filter(app => !this.installedOnly || app.installed === true)
        .filter(app => !q || this.textBlob(app).includes(q));
    },
    get baseFiltered(){
      return this.baseCandidates();
    },

    normalizeFacetValue(raw){
      const str = this.toText(raw).trim();
      if(!str) return null;
      const key = str.toLowerCase();
      return { key, label: this.formatFacetLabel(str) };
    },
    facetRawValues(app, group){
      switch(group){
        case 'departments': return this.parseDepts(app.department);
        case 'durableSkills': return this.parseList(app.durable_skills);
        case 'comfort': return this.parseList(app.comfort);
        case 'input': return this.parseList(app.input);
        case 'devices': return this.parseList(app.devices);
        case 'age': return this.parseList(app.age);
        default: return [];
      }
    },
    facetValuesForApp(app, group){
      return this.facetRawValues(app, group)
        .map(this.normalizeFacetValue.bind(this))
        .filter(Boolean)
        .reduce((list, entry) => {
          if(!list.find(existing => existing.key === entry.key)){
            list.push(entry);
          }
          return list;
        }, []);
    },
    facetSet(name){
      switch(name){
        case 'departments': return this.selectedDepartments;
        case 'durableSkills': return this.selectedDurableSkills;
        case 'comfort': return this.selectedComfort;
        case 'input': return this.selectedInput;
        case 'devices': return this.selectedDevices;
        case 'age': return this.selectedAge;
        default: return null;
      }
    },
    toggleFacet(name,value){
      const set = this.facetSet(name);
      if(!set) return;
      if(set.has(value)){
        set.delete(value);
      }else{
        set.add(value);
      }
      switch(name){
        case 'departments': this.selectedDepartments = new Set(set); break;
        case 'durableSkills': this.selectedDurableSkills = new Set(set); break;
        case 'comfort': this.selectedComfort = new Set(set); break;
        case 'input': this.selectedInput = new Set(set); break;
        case 'devices': this.selectedDevices = new Set(set); break;
        case 'age': this.selectedAge = new Set(set); break;
      }
    },
    isFacetSelected(name,value){
      const set = this.facetSet(name);
      return !!(set && set.has(value));
    },

    get facetOptions(){
      const buckets = {
        departments: new Map(),
        durableSkills: new Map(),
        comfort: new Map(),
        input: new Map(),
        devices: new Map(),
        age: new Map()
      };
      const addEntries = (map, entries) => {
        for(const entry of entries){
          if(!entry) continue;
          if(map.has(entry.key)){
            map.get(entry.key).count += 1;
          }else{
            map.set(entry.key,{ value: entry.key, label: entry.label, count:1 });
          }
        }
      };
      const basePool = this.baseCandidates();
      for(const app of basePool){
        addEntries(buckets.departments, this.facetValuesForApp(app,'departments'));
        addEntries(buckets.durableSkills, this.facetValuesForApp(app,'durableSkills'));
        addEntries(buckets.comfort, this.facetValuesForApp(app,'comfort'));
        addEntries(buckets.input, this.facetValuesForApp(app,'input'));
        addEntries(buckets.devices, this.facetValuesForApp(app,'devices'));
        addEntries(buckets.age, this.facetValuesForApp(app,'age'));
      }
      const collator = new Intl.Collator(undefined,{sensitivity:'base'});
      const toList = map => Array.from(map.values()).sort((a,b)=> b.count - a.count || collator.compare(a.label,b.label));
      return {
        departments: toList(buckets.departments),
        durableSkills: toList(buckets.durableSkills),
        comfort: toList(buckets.comfort),
        input: toList(buckets.input),
        devices: toList(buckets.devices),
        age: toList(buckets.age)
      };
    },

    clearFacetSelections(){
      this.selectedDepartments = new Set();
      this.selectedDurableSkills = new Set();
      this.selectedComfort = new Set();
      this.selectedInput = new Set();
      this.selectedDevices = new Set();
      this.selectedAge = new Set();
    },

    skillDefinition(skill){
      const key = this.toText(skill).trim().toLowerCase();
      return this.skillDefinitions[key] || 'A transferable skill that can support learning, collaboration, or workplace readiness across different contexts.';
    },
    metaExperienceId(link){
      const raw = this.toText(link).trim();
      if(!raw) return '';
      const match = raw.match(/\/experiences\/(?:pcvr\/)?(?:[^\/]+\/)?(\d{6,})\/?$/i)
        || raw.match(/\/experiences\/(\d{6,})\/?$/i);
      return match ? match[1] : '';
    },
    storeLink(app){
      const raw = this.toText(app?.link).trim();
      if(!raw) return '';
      const experienceId = this.metaExperienceId(raw);
      if(experienceId){
        return `https://www.meta.com/en-us/experiences/${experienceId}/`;
      }
      if(/^https?:\/\/www\.meta\.com\//i.test(raw)){
        return raw.replace(/^https?:\/\/www\.meta\.com\/(?:[a-z]{2}-[a-z]{2}\/)?/i,'https://www.meta.com/en-us/');
      }
      return raw;
    },
    primaryDepartment(app){
      const departments = this.parseDepts(app?.department);
      return departments[0] || 'General';
    },
    classroomSummary(app){
      const parts = [];
      if(typeof app?.time_min === 'number' && app.time_min > 0){
        parts.push(`${app.time_min} min`);
      }else{
        parts.push('Flexible length');
      }
      if(app?.comfort){
        parts.push(String(app.comfort));
      }
      if(app?.input){
        parts.push(String(app.input));
      }
      return parts.join(' • ');
    },
    classroomUse(app){
      const text = this.textBlob(app);
      if(/\bonboarding\b|first[-\s]?time|first steps|first contact|demo/.test(text)) return 'Best for first-time users';
      if(typeof app?.time_min === 'number' && app.time_min <= 20) return 'Good for a quick class activity';
      if(/\bcollaboration\b|team|multiplayer|multi-user|social/.test(text)) return 'Works well for pairs or groups';
      if(/\btraining\b|practice|presentation|public speaking|cpr|simulation/.test(text)) return 'Strong for guided practice';
      if(/\bexplore\b|field trip|tour|documentary|museum|history/.test(text)) return 'Good for guided exploration';
      return 'Useful for guided classroom use';
    },
    cardBadges(app){
      const badges = [];
      if(app?.installed === true) badges.push({ label: 'Installed', tone: 'green' });
      else if(app?.approved === true) badges.push({ label: 'Approved', tone: 'blue' });
      if(this.facet(app, 'free')) badges.push({ label: 'Free', tone: 'slate' });
      if(typeof app?.time_min === 'number' && app.time_min > 0) badges.push({ label: `${app.time_min} min`, tone: 'slate' });
      else badges.push({ label: 'Flexible length', tone: 'slate' });
      return badges.slice(0, 3);
    },

    textBlob(app){
      return [app.title, app.description, app.educational, app.notes, app.tags, app.department, app.durable_skills]
        .map(this.toText.bind(this)).join(' ').toLowerCase();
    },
    facet(app,key){
      const t = this.textBlob(app);
      const devices = Array.isArray(app.devices) ? app.devices.join(' ').toLowerCase() : '';
      const cost = (app.cost || '').toLowerCase();
      const input = (app.input || '').toLowerCase();
      const motion = (app.motion_level || '').toLowerCase();
      switch(key){
        case 'free': return cost === 'free' || /\bfree\b|no\s*cost/.test(t);
        case 'short': return (typeof app.time_min==='number' && app.time_min<=15) || /\b(10|12|15)\s*(min|minutes)\b|\bshort\b/.test(t);
        case 'hands': return input === 'hands' || input === 'both' || /\bhand(?:s)?\b|hand[-\s]?tracking/.test(t);
        case 'lowmotion': return motion === 'low' || (/\bseated\b/.test(t) && !/\b(locomotion|free movement|stick movement)\b/.test(t));
        case 'quest3': return /quest\s*3/.test(devices) || /\bquest\s*3\b|meta\s*quest\s*3/.test(t);
        default: return false;
      }
    },
    togglePill(key){
      if(this.quickPills.has(key)){
        this.quickPills.delete(key);
      }else{
        this.quickPills.add(key);
      }
      this.quickPills = new Set(this.quickPills);
    },

    clearAll(){
      this.quickPills = new Set();
      this.query = '';
      this.sortMode = 'az';
      this.approvedOnly = false;
      this.installedOnly = false;
      this.clearFacetSelections();
      this.detailsOpen = {};
    },
    clearVideoFilters(){
      this.videoQuery = '';
      this.videoDepartment = '';
      this.videoSortMode = 'az';
    },

    visibleInLibrary(app){
      return !!(app && (app.approved === true || app.installed === true));
    },
    matchesFacetSelection(app, group){
      const set = this.facetSet(group);
      if(!set || !set.size) return true;
      const values = this.facetValuesForApp(app, group);
      for(const entry of values){
        if(set.has(entry.key)) return true;
      }
      return false;
    },

    get filteredApps(){
      let out = this.baseFiltered;
      for(const group of ['departments','durableSkills','comfort','input','devices','age']){
        const set = this.facetSet(group);
        if(set && set.size){
          out = out.filter(app => this.matchesFacetSelection(app, group));
        }
      }
      const collator = new Intl.Collator(undefined,{sensitivity:'base'});
      return [...out].sort((a,b)=> this.sortMode==='za'
        ? collator.compare((b.title||''),(a.title||''))
        : collator.compare((a.title||''),(b.title||'')));
    },

    get videoDepartmentOptions(){
      const map = new Map();
      for(const video of this.VIDEOS){
        for(const dept of this.parseDepts(video.department)){
          const key = dept.toLowerCase();
          if(map.has(key)){
            map.get(key).count += 1;
          }else{
            map.set(key,{ value:key, label:this.formatFacetLabel(dept), count:1 });
          }
        }
      }
      const collator = new Intl.Collator(undefined,{sensitivity:'base'});
      return Array.from(map.values()).sort((a,b)=> b.count - a.count || collator.compare(a.label,b.label));
    },

    videoTextBlob(video){
      return [video.title, video.description, video.educational, video.notes, video.tags, video.department]
        .map(this.toText.bind(this)).join(' ').toLowerCase();
    },
    get filteredVideos(){
      const collator = new Intl.Collator(undefined,{sensitivity:'base'});
      const q = this.videoQuery.trim().toLowerCase();
      let out = this.VIDEOS.filter(item => {
        const matchesDept = !this.videoDepartment || this.parseDepts(item.department).map(d => d.toLowerCase()).includes(this.videoDepartment);
        const matchesQuery = !q || this.videoTextBlob(item).includes(q);
        return matchesDept && matchesQuery;
      });
      return [...out].sort((a,b)=> this.videoSortMode==='za'
        ? collator.compare((b.title||''),(a.title||''))
        : collator.compare((a.title||''),(b.title||'')));
    },

    toggleDetails(index){
      this.detailsOpen[index] = !this.detailsOpen[index];
      this.detailsOpen = { ...this.detailsOpen };
    },

    async loadData(){
      try{
        const appsRes = await fetch('app_library.json');
        const appsRaw = await appsRes.json();
        this.DATA = Array.isArray(appsRaw) ? appsRaw.map((item,i)=>({
          ...item,
          approved: item.approved === true,
          installed: item.installed === true,
          _idx: i
        })) : [];
        this.appsReady = true;
      }catch(err){
        console.error('Failed to load app_library.json', err);
        this.appsReady = true;
      }

      try{
        const videoRes = await fetch('video_content.json');
        const videoRaw = await videoRes.json();
        this.VIDEOS = Array.isArray(videoRaw) ? videoRaw.map((item,i)=>({
          ...item,
          _vid: i
        })) : [];
        this.videosReady = true;
      }catch(err){
        console.error('Failed to load video_content.json', err);
        this.videosReady = true;
      }
    }
  };
}
