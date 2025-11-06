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
    selectedComfort: new Set(),
    selectedInput: new Set(),
    selectedDevices: new Set(),
    selectedAge: new Set(),
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
        addEntries(buckets.comfort, this.facetValuesForApp(app,'comfort'));
        addEntries(buckets.input, this.facetValuesForApp(app,'input'));
        addEntries(buckets.devices, this.facetValuesForApp(app,'devices'));
        addEntries(buckets.age, this.facetValuesForApp(app,'age'));
      }
      const collator = new Intl.Collator(undefined,{sensitivity:'base'});
      const toList = map => Array.from(map.values()).sort((a,b)=> b.count - a.count || collator.compare(a.label,b.label));
      return {
        departments: toList(buckets.departments),
        comfort: toList(buckets.comfort),
        input: toList(buckets.input),
        devices: toList(buckets.devices),
        age: toList(buckets.age)
      };
    },

    clearFacetSelections(){
      this.selectedDepartments = new Set();
      this.selectedComfort = new Set();
      this.selectedInput = new Set();
      this.selectedDevices = new Set();
      this.selectedAge = new Set();
    },

    textBlob(app){
      return [app.title, app.description, app.educational, app.notes, app.tags, app.department]
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
      for(const group of ['departments','comfort','input','devices','age']){
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
