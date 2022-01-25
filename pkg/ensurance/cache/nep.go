package cache

import (
	"sync"

	ensuranceapi "github.com/gocrane/api/ensurance/v1alpha1"
)

type NodeQOSEnsurancePolicyCache struct {
	mu     sync.Mutex
	nepMap map[string]*ensuranceapi.NodeQOSEnsurancePolicy
}

func (s *NodeQOSEnsurancePolicyCache) Init() {
	s.nepMap = make(map[string]*ensuranceapi.NodeQOSEnsurancePolicy)
}

// ListKeys implements the interface required by DeltaFIFO to list the keys we
// already know about.
func (s *NodeQOSEnsurancePolicyCache) ListKeys() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	keys := make([]string, 0, len(s.nepMap))
	for k := range s.nepMap {
		keys = append(keys, k)
	}
	return keys
}

func (s *NodeQOSEnsurancePolicyCache) Get(name string) (*ensuranceapi.NodeQOSEnsurancePolicy, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	nep, ok := s.nepMap[name]
	return nep, ok
}

func (s *NodeQOSEnsurancePolicyCache) Exist(name string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.nepMap[name]
	return ok
}

func (s *NodeQOSEnsurancePolicyCache) GetOrCreate(nep *ensuranceapi.NodeQOSEnsurancePolicy) *ensuranceapi.NodeQOSEnsurancePolicy {
	s.mu.Lock()
	defer s.mu.Unlock()
	cacheNep, ok := s.nepMap[nep.Name]
	if !ok {
		s.nepMap[nep.Name] = nep
	}
	return cacheNep
}

func (s *NodeQOSEnsurancePolicyCache) Set(nep *ensuranceapi.NodeQOSEnsurancePolicy) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nepMap[nep.Name] = nep
}

func (s *NodeQOSEnsurancePolicyCache) Delete(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.nepMap, name)
}
