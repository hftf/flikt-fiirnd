var dedent = (str) => str[0].replace(/^\s+/gm, '')

var sampleInputs = {
nch_rch: dedent`
	replace pron (?<=æ)(n|ɹ)?(tʃ|dʒ) -> J
	accept  pron J
	freq    word 17
	min1    1 2
	group   1 2`,
ch_k: dedent`
	replace word ^[CcKk][Hh]? -> K
	accept  word K
	freq    word 1000
	min1    1 2
	group   1 2`,
// an example where the replacement uses steno keys (-> SPW)
int_abs: dedent`
	replace pron [ˌˈ] -> 
	replace pron [əɛ] -> E
	replace pron ^(ɪnt|æb[sz]t?) -> SPW
	accept  pron SPW
	freq    word 1
	min1    1 2
	group   1 2`,
rve_mblr: '',
ch_j: '',
}

// V: aæeiouɑɔəɛɝɪʊ
// C: bdfhjkmnpstvwzðŋɡɫɹʃʒθ

// ɝ, fvs -> ſ
